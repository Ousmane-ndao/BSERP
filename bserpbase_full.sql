-- =========================================================
-- BSERP - Script PostgreSQL complet
-- =========================================================

--DROP DATABASE IF EXISTS bserp;

--CREATE DATABASE bserp;

-- =========================================================
-- Se connecter ensuite à la base :
-- \c bserp
-- =========================================================

-- =========================================================
-- TABLE roles
-- =========================================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name) VALUES
('Directrice'),
('Responsable administrative'),
('Conseillère pédagogique'),
('Informaticien'),
('Comptable'),
('Commercial'),
('Accueil client');

-- =========================================================
-- TABLE employees
-- =========================================================
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employees_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_role_id ON employees(role_id);

INSERT INTO employees (name, email, role_id)
SELECT 'Mme Ba', 'mme.ba@bserp.com', id FROM roles WHERE name='Directrice';

INSERT INTO employees (name, email, role_id)
SELECT 'Mme Seck', 'mme.seck.admin@bserp.com', id FROM roles WHERE name='Responsable administrative';

INSERT INTO employees (name, email, role_id)
SELECT 'Mme Barry', 'mme.barry@bserp.com', id FROM roles WHERE name='Conseillère pédagogique';

INSERT INTO employees (name, email, role_id)
SELECT 'M. Sane', 'm.sane@bserp.com', id FROM roles WHERE name='Comptable';

INSERT INTO employees (name, email, role_id)
SELECT 'M. Mbodj', 'm.mbodj@bserp.com', id FROM roles WHERE name='Commercial';

INSERT INTO employees (name, email, role_id)
SELECT 'Mme Diop', 'mme.diop.commercial@bserp.com', id FROM roles WHERE name='Commercial';

INSERT INTO employees (name, email, role_id)
SELECT 'M. Gueye', 'm.gueye@bserp.com', id FROM roles WHERE name='Informaticien';

INSERT INTO employees (name, email, role_id)
SELECT 'M. Ndao', 'm.ndao@bserp.com', id FROM roles WHERE name='Informaticien';

INSERT INTO employees (name, email, role_id)
SELECT 'Accueil Client', 'accueil.client@bserp.com', id FROM roles WHERE name='Accueil client';

-- =========================================================
-- TABLE users
-- =========================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    employee_id INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);

-- =========================================================
-- TABLE destinations
-- =========================================================
CREATE TABLE destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type_compte VARCHAR(20) NOT NULL
        CHECK (type_compte IN ('COMPLET', 'SIMPLE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO destinations (name, type_compte) VALUES
('France', 'COMPLET'),
('Canada', 'SIMPLE'),
('Maroc', 'SIMPLE'),
('Turquie', 'SIMPLE');

-- =========================================================
-- TABLE clients
-- =========================================================
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    date_naissance DATE,
    etablissement VARCHAR(191),
    niveau_etude VARCHAR(120),
    telephone VARCHAR(50),
    email VARCHAR(191) NOT NULL UNIQUE,
    destination_id INTEGER NOT NULL,
    date_ouverture DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_clients_destination
        FOREIGN KEY (destination_id)
        REFERENCES destinations(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_destination_id ON clients(destination_id);

-- =========================================================
-- TABLE documents
-- =========================================================
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,

    type_document VARCHAR(100) NOT NULL CHECK (
        type_document IN (
            'Bulletin Seconde',
            'Bulletin Première',
            'Bulletin Terminale',
            'Diplôme Bac',
            'Certificat inscription',
            'Relevé notes',
            'Photo',
            'CNI ou Passeport'
        )
    ),

    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_documents_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_documents_client_id ON documents(client_id);

-- =========================================================
-- TABLE accounts
-- =========================================================
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL UNIQUE,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255),
    campus_password VARCHAR(255),
    parcoursup_password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_accounts_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_accounts_email ON accounts(email);

-- =========================================================
-- TABLE payments
-- =========================================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    montant DECIMAL(12,2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'XOF',
    methode VARCHAR(100) NOT NULL,
    date_paiement DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_payments_client_id ON payments(client_id);

-- =========================================================
-- Fonction PostgreSQL pour validation accounts
-- =========================================================

CREATE OR REPLACE FUNCTION validate_accounts()
RETURNS TRIGGER AS $$
DECLARE
    v_type_compte VARCHAR(20);
BEGIN

    SELECT d.type_compte
    INTO v_type_compte
    FROM clients c
    JOIN destinations d ON d.id = c.destination_id
    WHERE c.id = NEW.client_id
    LIMIT 1;

    IF v_type_compte = 'COMPLET' THEN

        IF NEW.password IS NULL
           OR NEW.campus_password IS NULL
           OR NEW.parcoursup_password IS NULL THEN

            RAISE EXCEPTION
            'Destination France/COMPLET : password, campus_password et parcoursup_password sont obligatoires.';

        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Trigger INSERT
-- =========================================================

CREATE TRIGGER trg_accounts_before_insert
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION validate_accounts();

-- =========================================================
-- Trigger UPDATE
-- =========================================================

CREATE TRIGGER trg_accounts_before_update
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION validate_accounts();