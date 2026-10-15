-- R5-0D: proposal + runnable migration for a NEW, DEDICATED budget database.
-- Not run in this environment. Execute only after explicit resource approval.
-- No passwords, connections, live grants or supplier data are included.
BEGIN;
CREATE ROLE cui_budget_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE cui_budget_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE SCHEMA cui_budget AUTHORIZATION cui_budget_owner;
SET LOCAL ROLE cui_budget_owner;
REVOKE ALL ON SCHEMA cui_budget FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA cui_budget REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- The account row is an operator-provisioned, non-resettable identity registry.
-- runtime_role is the actual login (session_user), NOT caller-supplied identity.
CREATE TABLE cui_budget.accounts (
 account_id text PRIMARY KEY CHECK(length(account_id) BETWEEN 1 AND 200),
 runtime_role name NOT NULL UNIQUE,
 ledger_id text NOT NULL UNIQUE,
 identity_path text NOT NULL UNIQUE CHECK(identity_path LIKE '/%'),
 initialization_id text NOT NULL UNIQUE,
 approved_config text NOT NULL,
 price_version text NOT NULL,
 price_digest text NOT NULL CHECK(price_digest ~ '^[0-9a-f]{64}$'),
 price_usd_input numeric NOT NULL CHECK(price_usd_input>0),
 price_usd_output numeric NOT NULL CHECK(price_usd_output>0),
 price_cny_input numeric NOT NULL CHECK(price_cny_input>0),
 price_cny_output numeric NOT NULL CHECK(price_cny_output>0),
 reserve_usd bigint NOT NULL CHECK(reserve_usd>0),
 reserve_cny bigint NOT NULL CHECK(reserve_cny>0),
 max_requests integer NOT NULL CHECK(max_requests BETWEEN 1 AND 80),
 max_usd bigint NOT NULL CHECK(max_usd BETWEEN 1 AND 2000000),
 policy_expires_at timestamptz NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 initialized boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 -- Text preserves JSON property order for the frozen JS SHA256 digest.
 state_text text,
 anchor_text text,
 CHECK((NOT initialized AND revision=0 AND state_text IS NULL AND anchor_text IS NULL)
    OR (initialized AND revision>0 AND state_text IS NOT NULL AND anchor_text IS NOT NULL))
);
-- Operator authorizes the EXACT normalized grant, including its cumulative
-- baseline, price, expiry and balance. Runtime cannot insert or widen it.
CREATE TABLE cui_budget.batch_grants (
 account_id text NOT NULL REFERENCES cui_budget.accounts(account_id),
 grant_id text NOT NULL,
 document jsonb NOT NULL CHECK(jsonb_typeof(document)='object'),
 PRIMARY KEY(account_id,grant_id)
);
CREATE TABLE cui_budget.audit (
 account_id text NOT NULL REFERENCES cui_budget.accounts(account_id),
 revision bigint NOT NULL,
 committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 session_role name NOT NULL,
 old_digest text,
 new_digest text NOT NULL,
 request_count integer NOT NULL,
 committed_usd bigint NOT NULL,
 committed_cny bigint NOT NULL,
 -- Every revision retained for reconciliation; no runtime UPDATE/DELETE grant.
 state_text text NOT NULL,
 PRIMARY KEY(account_id,revision)
);

CREATE FUNCTION cui_budget.lock_snapshot(p_account text,p_path text)
RETURNS TABLE(account_id text,identity_path text,initialized boolean,revision bigint,state_text text,anchor_text text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cui_budget,pg_temp AS $$
DECLARE r cui_budget.accounts%ROWTYPE;
BEGIN
 SELECT * INTO r FROM cui_budget.accounts a WHERE a.account_id=p_account FOR UPDATE;
 IF NOT FOUND OR r.runtime_role<>session_user OR r.identity_path<>p_path OR NOT r.enabled THEN
  RAISE EXCEPTION 'budget identity denied' USING ERRCODE='42501';
 END IF;
 IF r.policy_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'budget policy expired'; END IF;
 RETURN QUERY SELECT r.account_id,r.identity_path,r.initialized,r.revision,r.state_text,r.anchor_text;
END $$;

CREATE FUNCTION cui_budget.commit_snapshot(p_account text,p_path text,p_revision bigint,p_state text,p_anchor text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cui_budget,pg_temp AS $$
DECLARE r cui_budget.accounts%ROWTYPE; s jsonb; a jsonb; old jsonb;
 e jsonb; prev jsonb; g jsonb; active jsonb; approved jsonb;
 cnt integer:=0; usd bigint:=0; cny bigint:=0; inflight integer:=0;
 n integer; gu bigint; gc bigint; baseline bigint:=0;
 pt bigint; ct bigint; now_ms bigint; grant_index integer:=0;
BEGIN
 SELECT * INTO r FROM cui_budget.accounts x WHERE x.account_id=p_account FOR UPDATE;
 IF NOT FOUND OR r.runtime_role<>session_user OR r.identity_path<>p_path OR NOT r.enabled THEN RAISE EXCEPTION 'budget identity denied' USING ERRCODE='42501'; END IF;
 IF r.revision<>p_revision OR r.policy_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'budget revision or policy denied'; END IF;
 IF length(p_state)>500000 OR length(p_anchor)>5000 THEN RAISE EXCEPTION 'budget data too large'; END IF;
 s:=p_state::jsonb; a:=p_anchor::jsonb; old:=r.state_text::jsonb;
 now_ms:=floor(extract(epoch FROM clock_timestamp())*1000);
 IF jsonb_typeof(s)<>'object' OR jsonb_typeof(a)<>'object' OR
  s->>'accountId' IS DISTINCT FROM r.account_id OR s->>'ledgerId' IS DISTINCT FROM r.ledger_id OR
  s->>'path' IS DISTINCT FROM r.identity_path OR s->>'initializationId' IS DISTINCT FROM r.initialization_id OR
  s->>'config' IS DISTINCT FROM r.approved_config OR s->>'mode' IS DISTINCT FROM 'live' OR s->>'version' IS DISTINCT FROM '2' OR
  (s->>'revision')::bigint IS DISTINCT FROM r.revision+1 OR
  a IS DISTINCT FROM jsonb_build_object('accountId',r.account_id,'ledgerId',r.ledger_id,'path',r.identity_path,
   'initializationId',r.initialization_id,'revision',r.revision+1,'digest',encode(sha256(convert_to(p_state,'UTF8')),'hex')) OR
  jsonb_typeof(s->'entries') IS DISTINCT FROM 'array' OR jsonb_typeof(s->'grants') IS DISTINCT FROM 'array' OR
  jsonb_typeof(s->'halted') IS DISTINCT FROM 'boolean' OR jsonb_array_length(s->'grants')<1
 THEN RAISE EXCEPTION 'budget state invalid'; END IF;
 IF NOT r.initialized AND (jsonb_array_length(s->'entries')<>0 OR jsonb_array_length(s->'grants')<>1) THEN RAISE EXCEPTION 'initialization must be empty and explicitly provisioned'; END IF;
 IF r.initialized AND EXISTS(SELECT 1 FROM jsonb_array_elements(old->'entries') x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'entries') y WHERE y->>'id'=x->>'id')) THEN RAISE EXCEPTION 'request history removal'; END IF;
 IF r.initialized AND (jsonb_array_length(s->'entries')<jsonb_array_length(old->'entries') OR jsonb_array_length(s->'entries')>jsonb_array_length(old->'entries')+1 OR
  NOT (s->'grants' @> old->'grants') OR (old->>'halted')::boolean AND NOT (s->>'halted')::boolean) THEN RAISE EXCEPTION 'budget history rollback'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(s->'entries') x)<>jsonb_array_length(s->'entries') OR
  (SELECT count(DISTINCT (x->>'requestId',x->>'step')) FROM jsonb_array_elements(s->'entries') x)<>jsonb_array_length(s->'entries') OR
  (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(s->'grants') x)<>jsonb_array_length(s->'grants') THEN RAISE EXCEPTION 'budget duplicate'; END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(s->'grants') LOOP
  grant_index:=grant_index+1;
  IF (grant_index=1 AND g->>'kind' IS DISTINCT FROM 'first') OR (grant_index>1 AND g->>'kind' IS DISTINCT FROM 'next') THEN RAISE EXCEPTION 'batch kind order'; END IF;
  SELECT document INTO approved FROM cui_budget.batch_grants WHERE account_id=p_account AND grant_id=g->>'id';
  IF NOT FOUND OR approved IS DISTINCT FROM g OR g->>'accountId' IS DISTINCT FROM r.account_id OR g->>'ledgerId' IS DISTINCT FROM r.ledger_id OR
   g->>'priceVersion' IS DISTINCT FROM r.price_version OR g->>'approved' IS DISTINCT FROM 'true' OR g->>'kind' NOT IN ('first','next') OR
   (g->>'maxRequests')::integer NOT BETWEEN 1 AND 80 OR (g->>'maxUsdMicros')::bigint NOT BETWEEN 1 AND r.max_usd OR
   (g->>'maxCnyMicros')::bigint<1 OR (g->>'balanceCnyMicros')::bigint<0 OR
   (g->>'baselineCnyMicros')::bigint IS DISTINCT FROM baseline OR
   (g->>'expiresAt')::bigint<=(g->>'issuedAt')::bigint OR (g->>'expiresAt')::bigint-(g->>'issuedAt')::bigint>3600000 OR
   (g->>'balanceVerifiedAt')::bigint>(g->>'issuedAt')::bigint OR (g->>'issuedAt')::bigint-(g->>'balanceVerifiedAt')::bigint>3600000
   THEN RAISE EXCEPTION 'batch not operator approved'; END IF;
  IF (baseline=0 AND g=s->'grants'->0 AND g->>'kind'<>'first') OR
   (g->>'kind'='first' AND ((g->>'maxRequests')::integer>6 OR (g->>'maxCnyMicros')::bigint>500000)) THEN RAISE EXCEPTION 'first batch limit'; END IF;
  IF g->>'id'=s->>'activeGrant' THEN active:=g; END IF;
  SELECT count(*),coalesce(sum(coalesce((x->>'actualMicros')::bigint,(x->>'reservedMicros')::bigint)),0),
   coalesce(sum(coalesce((x->>'actualCnyMicros')::bigint,(x->>'reservedCnyMicros')::bigint)),0)
   INTO n,gu,gc FROM jsonb_array_elements(s->'entries') x WHERE x->>'grantId'=g->>'id';
  IF n>(g->>'maxRequests')::integer OR gu>(g->>'maxUsdMicros')::bigint OR gc>(g->>'maxCnyMicros')::bigint OR gc>(g->>'balanceCnyMicros')::bigint THEN RAISE EXCEPTION 'batch budget exhausted'; END IF;
  baseline:=baseline+gc;
 END LOOP;
 IF active IS NULL THEN RAISE EXCEPTION 'batch missing'; END IF;
 IF r.initialized AND s->>'activeGrant' IS DISTINCT FROM old->>'activeGrant' AND
  (s->>'activeGrant' IS DISTINCT FROM (s->'grants'->(jsonb_array_length(s->'grants')-1))->>'id' OR
   jsonb_array_length(s->'grants')<>jsonb_array_length(old->'grants')+1 OR
   (old->>'halted')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements(old->'entries') x WHERE x->>'status' IN ('reserved','dispatched','uncertain'))) THEN RAISE EXCEPTION 'batch transition denied'; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(s->'entries') LOOP
  cnt:=cnt+1;
  IF NOT (e ?& ARRAY['id','requestId','step','status','reservedMicros','reservedCnyMicros','actualMicros','actualCnyMicros','usage','providerId','grantId','priceVersion','priceDigest','createdAt','dispatchedAt','dispatchUsed']) OR jsonb_typeof(e->'status') IS DISTINCT FROM 'string' OR (e->>'step') IS NULL OR length(e->>'id') NOT BETWEEN 1 AND 200 OR length(e->>'requestId') NOT BETWEEN 1 AND 200 OR e->>'status' NOT IN ('reserved','dispatched','settled','uncertain') OR (e->>'reservedMicros')::bigint IS DISTINCT FROM r.reserve_usd OR
   (e->>'reservedCnyMicros')::bigint IS DISTINCT FROM r.reserve_cny OR e->>'priceVersion' IS DISTINCT FROM r.price_version OR e->>'priceDigest' IS DISTINCT FROM r.price_digest OR
   e->>'id' IS NULL OR e->>'requestId' IS NULL OR (e->>'step')::numeric<0 OR (e->>'step')::numeric<>trunc((e->>'step')::numeric) OR
   jsonb_typeof(e->'dispatchUsed') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'request invalid'; END IF;
  SELECT value INTO g FROM jsonb_array_elements(s->'grants') WHERE value->>'id'=e->>'grantId';
  IF g IS NULL OR (e->>'createdAt')::bigint<(g->>'issuedAt')::bigint OR (e->>'createdAt')::bigint>=(g->>'expiresAt')::bigint THEN RAISE EXCEPTION 'request grant invalid'; END IF;
  SELECT value INTO prev FROM jsonb_array_elements(old->'entries') WHERE value->>'id'=e->>'id';
  IF prev IS NOT NULL THEN
   IF (e-ARRAY['status','dispatchedAt','dispatchUsed','usage','providerId','actualMicros','actualCnyMicros']) IS DISTINCT FROM
    (prev-ARRAY['status','dispatchedAt','dispatchUsed','usage','providerId','actualMicros','actualCnyMicros']) OR
    (prev->>'dispatchUsed')::boolean AND NOT (e->>'dispatchUsed')::boolean OR
    (prev->>'dispatchedAt' IS NOT NULL AND e->'dispatchedAt' IS DISTINCT FROM prev->'dispatchedAt') OR
    (prev->>'status' IN ('settled','uncertain') AND e IS DISTINCT FROM prev) OR
    (prev->>'status'='dispatched' AND e->>'status'='reserved') OR
    (prev->>'status'='reserved' AND (e->>'status'='settled' OR (e->>'dispatchUsed')::boolean)) OR
    (e->>'status'='settled' AND prev->>'dispatchUsed' IS DISTINCT FROM 'true') THEN RAISE EXCEPTION 'illegal request transition'; END IF;
  ELSE
   IF e->>'status'<>'reserved' OR e->>'grantId'<>s->>'activeGrant' OR (s->>'halted')::boolean OR
    (g->>'expiresAt')::bigint<=now_ms OR (g->>'issuedAt')::bigint>now_ms OR
    EXISTS(SELECT 1 FROM jsonb_array_elements(old->'entries') x WHERE x->>'status' IN ('reserved','dispatched','uncertain')) THEN RAISE EXCEPTION 'reservation denied'; END IF;
  END IF;
  IF e->>'status'='settled' THEN
   pt:=(e->'usage'->>'prompt_tokens')::bigint; ct:=(e->'usage'->>'completion_tokens')::bigint;
   IF pt IS NULL OR ct IS NULL OR pt NOT BETWEEN 0 AND 6000 OR ct NOT BETWEEN 0 AND 800 OR
    (e->'usage'->>'total_tokens')::bigint IS DISTINCT FROM pt+ct OR e->>'providerId' IS NULL OR
    e->>'dispatchUsed' IS DISTINCT FROM 'true' OR e->>'dispatchedAt' IS NULL OR
    (e->>'actualMicros')::bigint IS DISTINCT FROM ceil(pt*r.price_usd_input+ct*r.price_usd_output)::bigint OR
    (e->>'actualCnyMicros')::bigint IS DISTINCT FROM ceil(pt*r.price_cny_input+ct*r.price_cny_output)::bigint OR
    (e->>'actualMicros')::bigint>r.reserve_usd OR (e->>'actualCnyMicros')::bigint>r.reserve_cny THEN RAISE EXCEPTION 'settlement invalid'; END IF;
  ELSE
   IF e->>'actualMicros' IS NOT NULL OR e->>'actualCnyMicros' IS NOT NULL OR e->>'usage' IS NOT NULL OR e->>'providerId' IS NOT NULL THEN RAISE EXCEPTION 'unsettled amount invalid'; END IF;
  END IF;
  IF (e->>'status'='reserved' AND (e->>'dispatchUsed'<>'false' OR e->>'dispatchedAt' IS NOT NULL)) OR
   (e->>'status'='dispatched' AND e->>'dispatchedAt' IS NULL) OR
   (e->>'status'='uncertain' AND s->>'halted'<>'true') THEN RAISE EXCEPTION 'dispatch state invalid'; END IF;
  IF e->>'status' IN ('reserved','dispatched') THEN inflight:=inflight+1; END IF;
  usd:=usd+coalesce((e->>'actualMicros')::bigint,r.reserve_usd);
  cny:=cny+coalesce((e->>'actualCnyMicros')::bigint,r.reserve_cny);
 END LOOP;
 IF cnt>r.max_requests OR usd>r.max_usd OR inflight>1 OR s->'metrics' IS DISTINCT FROM jsonb_build_object('requests',cnt,'usd',usd,'cny',cny) THEN RAISE EXCEPTION 'account budget exhausted or corrupt'; END IF;
 -- A request consumed immediately before model dispatch must have a live grant.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s->'entries') x WHERE x->>'status'='dispatched' AND x->>'dispatchUsed'='true'
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(old->'entries') y WHERE y->>'id'=x->>'id' AND y->>'dispatchUsed'='true'))
   AND (active->>'expiresAt')::bigint<=now_ms THEN RAISE EXCEPTION 'dispatch grant expired'; END IF;
 INSERT INTO cui_budget.audit(account_id,revision,session_role,old_digest,new_digest,request_count,committed_usd,committed_cny,state_text)
  VALUES(p_account,r.revision+1,session_user,r.anchor_text::jsonb->>'digest',a->>'digest',cnt,usd,cny,p_state);
 UPDATE cui_budget.accounts SET initialized=true,revision=r.revision+1,state_text=p_state,anchor_text=p_anchor WHERE account_id=p_account;
 RETURN r.revision+1;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA cui_budget FROM PUBLIC,cui_budget_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cui_budget FROM PUBLIC;
GRANT USAGE ON SCHEMA cui_budget TO cui_budget_runtime;
GRANT EXECUTE ON FUNCTION cui_budget.lock_snapshot(text,text) TO cui_budget_runtime;
GRANT EXECUTE ON FUNCTION cui_budget.commit_snapshot(text,text,bigint,text,text) TO cui_budget_runtime;
COMMIT;
