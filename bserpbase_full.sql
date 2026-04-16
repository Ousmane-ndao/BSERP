-- =========================================================
-- BSERP - Script SQL complet (MySQL)
-- Conforme au cahier des charges fourni
-- =========================================================

DROP DATABASE IF EXISTS bserpbase;

CREATE DATABASE bserpbase
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bserpbase;

-- =========================================================
-- TABLE roles
-- =========================================================
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employees_email (email),
  UNIQUE KEY uq_employees_email (email),
  INDEX idx_employees_role_id (role_id),
  CONSTRAINT fk_employees_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(255) NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_employee_id (employee_id),
  CONSTRAINT fk_users_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLE destinations
-- =========================================================
CREATE TABLE destinations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type_compte ENUM('COMPLET', 'SIMPLE') NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_destinations_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO destinations (name, type_compte) VALUES
('France', 'COMPLET'),
('Canada', 'SIMPLE'),
('Maroc', 'SIMPLE'),
('Turquie', 'SIMPLE');

-- =========================================================
-- TABLE clients
-- =========================================================
CREATE TABLE clients (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  date_naissance DATE NULL,
  etablissement VARCHAR(191) NULL,
  niveau_etude VARCHAR(120) NULL,
  telephone VARCHAR(50) NULL,
  email VARCHAR(191) NOT NULL,
  destination_id INT UNSIGNED NOT NULL,
  date_ouverture DATE NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clients_email (email),
  UNIQUE KEY uq_clients_email (email),
  INDEX idx_clients_destination_id (destination_id),
  CONSTRAINT fk_clients_destination
    FOREIGN KEY (destination_id) REFERENCES destinations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLE documents
-- =========================================================
CREATE TABLE documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id INT UNSIGNED NOT NULL,
  type_document ENUM(
    'Bulletin Seconde',
    'Bulletin Première',
    'Bulletin Terminale',
    'Diplôme Bac',
    'Certificat inscription',
    'Relevé notes',
    'Photo',
    'CNI ou Passeport'
  ) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_documents_client_id (client_id),
  CONSTRAINT fk_documents_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLE accounts
-- =========================================================
CREATE TABLE accounts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id INT UNSIGNED NOT NULL,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(255) NULL,
  campus_password VARCHAR(255) NULL,
  parcoursup_password VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_accounts_email (email),
  UNIQUE KEY uq_accounts_email (email),
  UNIQUE KEY uq_accounts_client_id (client_id),
  CONSTRAINT fk_accounts_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLE payments
-- =========================================================
CREATE TABLE payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id INT UNSIGNED NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'XOF',
  methode VARCHAR(100) NOT NULL,
  date_paiement DATE NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_client_id (client_id),
  CONSTRAINT fk_payments_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Règle métier accounts :
-- Si destination = France (COMPLET) => password, campus_password, parcoursup_password obligatoires
-- Sinon => email seulement (les autres NULL autorisés)
-- =========================================================
DELIMITER $$

CREATE TRIGGER trg_accounts_before_insert
BEFORE INSERT ON accounts
FOR EACH ROW
BEGIN
  DECLARE v_type_compte VARCHAR(20);

  SELECT d.type_compte
    INTO v_type_compte
  FROM clients c
  JOIN destinations d ON d.id = c.destination_id
  WHERE c.id = NEW.client_id
  LIMIT 1;

  IF v_type_compte = 'COMPLET' THEN
    IF NEW.password IS NULL OR NEW.campus_password IS NULL OR NEW.parcoursup_password IS NULL THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Destination France/COMPLET: password, campus_password et parcoursup_password sont obligatoires.';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_accounts_before_update
BEFORE UPDATE ON accounts
FOR EACH ROW
BEGIN
  DECLARE v_type_compte VARCHAR(20);

  SELECT d.type_compte
    INTO v_type_compte
  FROM clients c
  JOIN destinations d ON d.id = c.destination_id
  WHERE c.id = NEW.client_id
  LIMIT 1;

  IF v_type_compte = 'COMPLET' THEN
    IF NEW.password IS NULL OR NEW.campus_password IS NULL OR NEW.parcoursup_password IS NULL THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Destination France/COMPLET: password, campus_password et parcoursup_password sont obligatoires.';
    END IF;
  END IF;
END$$

DELIMITER ;

