CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  username VARCHAR(20) NOT NULL UNIQUE CHECK (username REGEXP '^[A-Za-z0-9_]{3,20}$'),
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- I tre valori STR/VIT/AGI memorizzati qui sono i soli punti quest guadagnati.
-- Il bonus del rank viene calcolato quando mostriamo il profilo o simula una battaglia.
CREATE TABLE avatars (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  total_xp BIGINT UNSIGNED NOT NULL DEFAULT 0,
  monarch_class ENUM('Ombre','Fuoco','Ghiaccio','Fulmini','Vento','Bestie') NULL,
  str INT UNSIGNED NOT NULL DEFAULT 0,
  vit INT UNSIGNED NOT NULL DEFAULT 0,
  agi INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT avatars_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE,
  unlock_rank VARCHAR(8) NOT NULL,
  str_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  vit_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  agi_percent DECIMAL(5,2) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO items(name, unlock_rank, str_percent, vit_percent, agi_percent) VALUES
('Comune','E III',3,0,0),('Raro','D III',0,0,5),('Super raro','C III',0,8,0),
('Epico','B III',10,0,5),('Mitico','A III',0,8,12),('Leggendario','SSS',10,10,10);

CREATE TABLE equipped_items (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  item_id BIGINT UNSIGNED NOT NULL,
  CONSTRAINT equipped_items_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT equipped_items_item_fk FOREIGN KEY(item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE exercises (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500) NOT NULL,
  objective VARCHAR(80) NOT NULL,
  difficulty ENUM('facile','media','hard') NOT NULL,
  stat ENUM('STR','VIT','AGI') NOT NULL,
  KEY exercises_pool_idx(difficulty, stat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO exercises(name,description,objective,difficulty,stat) VALUES
('Piegamenti classici','Esegui piegamenti controllati mantenendo il corpo allineato.','20 ripetizioni','facile','STR'),
('Squat a corpo libero','Scendi fino a una posizione comoda e risali con controllo.','20 ripetizioni','facile','STR'),
('Affondi alternati','Alterna le gambe mantenendo il busto stabile.','16 ripetizioni','facile','STR'),
('Piegamenti al muro','Spingi contro il muro con movimento lento e controllato.','20 ripetizioni','facile','STR'),
('Plank alto con tocchi','Tocca una spalla alla volta senza ruotare il bacino.','16 ripetizioni','facile','STR'),
('Plank','Mantieni il corpo in linea e respira regolarmente.','1 minuto','facile','VIT'),
('Marcia sul posto','Marcia a ritmo regolare sollevando le ginocchia.','2 minuti','facile','VIT'),
('Dead bug','Muovi braccio e gamba opposti mantenendo la schiena stabile.','16 ripetizioni','facile','VIT'),
('Ponte glutei','Solleva il bacino e mantieni la posizione in alto.','20 ripetizioni','facile','VIT'),
('Bird dog','Allunga braccio e gamba opposti mantenendo il busto fermo.','16 ripetizioni','facile','VIT'),
('Calf raise','Solleva i talloni e torna lentamente a terra.','20 ripetizioni','facile','AGI'),
('High knees leggeri','Corri sul posto con passi rapidi e leggeri.','30 secondi','facile','AGI'),
('Saltelli laterali','Salta da un lato all’altro mantenendo equilibrio.','20 ripetizioni','facile','AGI'),
('Skip sul posto','Alterna rapidamente le ginocchia mantenendo ritmo.','30 secondi','facile','AGI'),
('Jumping jack','Apri e chiudi braccia e gambe con ritmo costante.','30 ripetizioni','facile','AGI'),
('Piegamenti stretti','Mantieni le mani sotto le spalle durante la spinta.','12 ripetizioni','media','STR'),
('Squat con pausa','Fermati un secondo in basso e risali con controllo.','15 ripetizioni','media','STR'),
('Dip su sedia','Fletti i gomiti e spingi per tornare su.','12 ripetizioni','media','STR'),
('Pike push-up','Spingi il corpo verso l’alto mantenendo il bacino sollevato.','10 ripetizioni','media','STR'),
('Plank laterale','Mantieni il fianco sollevato senza ruotare il busto.','45 secondi per lato','media','VIT'),
('Mountain climber','Porta le ginocchia al petto alternandole con controllo.','40 ripetizioni','media','VIT'),
('Burpee controllato','Esegui accosciata, plank e ritorno in piedi senza pausa.','12 ripetizioni','media','VIT'),
('Wall sit','Mantieni la schiena al muro e le ginocchia piegate.','1 minuto','media','VIT'),
('Box jump basso','Salta su un rialzo stabile e scendi con attenzione.','12 ripetizioni','hard','AGI'),
('Burpee broad jump','Unisci burpee e salto in avanti, atterrando morbido.','10 ripetizioni','hard','AGI'),
('Agility ladder immaginaria','Esegui passi rapidi dentro e fuori da caselle immaginarie.','1 minuto','hard','AGI'),
('Squat jump','Scendi in squat e salta verticalmente atterrando morbido.','15 ripetizioni','hard','STR'),
('Push-up tempo','Scendi lentamente e risali con spinta decisa.','15 ripetizioni','hard','STR'),
('Pistol squat assistito','Esegui squat su una gamba aiutandoti a mantenere equilibrio.','8 ripetizioni per lato','hard','STR'),
('Burpee','Alterna plank, raccolta delle gambe e salto verticale.','15 ripetizioni','hard','VIT'),
('Corsa sul posto intensa','Corri sul posto mantenendo un ritmo sostenuto.','2 minuti','hard','VIT'),
('Plank dinamico','Passa da plank alto a basso mantenendo il busto stabile.','20 ripetizioni','hard','VIT'),
('Lateral hops','Salta lateralmente oltre una linea immaginaria.','30 ripetizioni','media','AGI'),
('Shuttle run','Corri avanti e indietro tra due punti vicini.','6 ripetizioni','media','AGI'),
('Skater jump','Salta lateralmente atterrando su una gamba alternata.','16 ripetizioni','media','AGI'),
('Piedi rapidi','Alterna appoggi veloci dentro e fuori da una linea.','30 secondi','media','AGI'),
('Affondi saltati','Alterna gli affondi con un salto controllato.','12 ripetizioni','hard','AGI'),
('Sprint con cambio direzione','Alterna brevi accelerazioni e cambi rapidi di direzione.','8 ripetizioni','hard','AGI');

CREATE TABLE daily_quests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  quest_date DATE NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  status ENUM('assegnata','in_attesa','verificata') NOT NULL DEFAULT 'assegnata',
  verifier_id BIGINT UNSIGNED NULL,
  completed_at DATETIME NULL,
  verified_at DATETIME NULL,
  xp_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  stat_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY daily_quest_user_exercise_uq(user_id, quest_date, exercise_id),
  KEY daily_quest_date_idx(user_id, quest_date, status),
  CONSTRAINT daily_quest_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT daily_quest_exercise_fk FOREIGN KEY(exercise_id) REFERENCES exercises(id),
  CONSTRAINT daily_quest_verifier_fk FOREIGN KEY(verifier_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE friendships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  requester_id BIGINT UNSIGNED NOT NULL,
  addressee_id BIGINT UNSIGNED NOT NULL,
  pair_low BIGINT UNSIGNED NOT NULL,
  pair_high BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  CHECK(requester_id <> addressee_id),
  CHECK(pair_low = LEAST(requester_id,addressee_id)),
  CHECK(pair_high = GREATEST(requester_id,addressee_id)),
  UNIQUE KEY friendships_pair_uq(pair_low,pair_high),
  KEY friendships_incoming_idx(addressee_id,status),
  CONSTRAINT friendships_requester_fk FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT friendships_addressee_fk FOREIGN KEY(addressee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE battles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  challenger_id BIGINT UNSIGNED NOT NULL,
  opponent_id BIGINT UNSIGNED NOT NULL,
  winner_id BIGINT UNSIGNED NULL,
  challenger_stats JSON NOT NULL,
  opponent_stats JSON NOT NULL,
  turn_log JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(challenger_id <> opponent_id),
  KEY battles_challenger_date_idx(challenger_id,created_at DESC),
  KEY battles_opponent_date_idx(opponent_id,created_at DESC),
  CONSTRAINT battles_challenger_fk FOREIGN KEY(challenger_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT battles_opponent_fk FOREIGN KEY(opponent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT battles_winner_fk FOREIGN KEY(winner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sessioni di login: nel cookie httpOnly c'è il token casuale, qui salviamo solo il suo hash.
CREATE TABLE sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  KEY sessions_user_idx(user_id),
  CONSTRAINT sessions_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
