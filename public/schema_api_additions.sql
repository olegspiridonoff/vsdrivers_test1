-- Дополнение к database.sql для этапа 4 (REST API + серверный RBAC).
-- Применить после основной схемы: mysql taxi_accounting < schema_api_additions.sql

USE taxi_accounting;

-- Токены сессий (Bearer), выдаются при логине, живут 7 дней.
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Демо-пароли из README (admin123/manager123/driver123) в формате bcrypt
-- для password_verify() на сервере. Заменяет placeholder-хэши из database.sql.
UPDATE users SET password_hash = '$2y$10$mkm5by6ZHSOERhVZTPfe0eK9oPq9dJ7vF0zW1Hq3mC0uJj3nBbRuG' WHERE email = 'admin@taxi.ru';   -- admin123
UPDATE users SET password_hash = '$2y$10$placeholder_replace_with_php_password_hash_manager123' WHERE email = 'manager@taxi.ru'; -- manager123
UPDATE users SET password_hash = '$2y$10$placeholder_replace_with_php_password_hash_driver123' WHERE email IN ('driver1@taxi.ru', 'driver2@taxi.ru'); -- driver123

-- ВНИМАНИЕ: строки выше — схема. Реальные bcrypt-хэши сгенерируйте так:
--   php -r "echo password_hash('admin123', PASSWORD_DEFAULT), PHP_EOL;"
-- и подставьте результат в UPDATE (bcrypt-хэш меняется при каждой генерации — это нормально).
