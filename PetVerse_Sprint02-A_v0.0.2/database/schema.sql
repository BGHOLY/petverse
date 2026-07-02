-- Sprint02-A schema placeholder

CREATE TABLE user (
 id BIGINT PRIMARY KEY,
 nickname VARCHAR(50),
 level INT,
 vip_level INT,
 gold BIGINT,
 diamond BIGINT
);

CREATE TABLE pet (
 id BIGINT PRIMARY KEY,
 owner_id BIGINT,
 nickname VARCHAR(50),
 rarity TINYINT,
 breed INT,
 level INT,
 gene_code VARCHAR(64),
 father_id BIGINT,
 mother_id BIGINT
);
