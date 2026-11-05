-- AET Platform · AI Lab y Showcase pasan a ser dos etapas. Re-ejecutable.
-- El valor histórico AI_LAB_SHOWCASE queda como «AI Lab» (no se renombra: datos y eventos existentes siguen válidos)
-- y se agrega SHOWCASE después de él. Va solo en este archivo: un valor nuevo de enum no se puede usar
-- en la misma transacción en que se crea.
alter type public.journey_layer add value if not exists 'SHOWCASE' after 'AI_LAB_SHOWCASE';
