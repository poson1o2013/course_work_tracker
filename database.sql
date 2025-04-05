-- Створення бази даних
CREATE DATABASE tracker;

-- Підключення до бази даних
\c tracker;

-- Створення розширення для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Створення таблиці користувачів
CREATE TABLE users(
    user_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

-- Створення таблиці курсів
CREATE TABLE courses(
    course_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name VARCHAR(255) NOT NULL,
    course_description TEXT,
    teacher_id uuid REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці курсових робіт
CREATE TABLE course_works(
    work_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id uuid REFERENCES users(user_id),
    course_id uuid REFERENCES courses(course_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'in_progress',
    progress INTEGER DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці файлів
CREATE TABLE work_files(
    file_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id uuid REFERENCES course_works(work_id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці коментарів
CREATE TABLE comments(
    comment_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id uuid REFERENCES course_works(work_id),
    user_id uuid REFERENCES users(user_id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці оцінок
CREATE TABLE grades(
    grade_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id uuid REFERENCES course_works(work_id),
    teacher_id uuid REFERENCES users(user_id),
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення індексів для оптимізації запитів
CREATE INDEX idx_course_works_student ON course_works(student_id);
CREATE INDEX idx_course_works_course ON course_works(course_id);
CREATE INDEX idx_work_files_work ON work_files(work_id);
CREATE INDEX idx_comments_work ON comments(work_id);
CREATE INDEX idx_grades_work ON grades(work_id);

-- Додавання тестових даних
INSERT INTO users (user_name, user_email, user_password, role) 
VALUES 
('nazar', 'nazar@gmail.com', 'userpass', 'student'),
('teacher', 'teacher@gmail.com', 'teacherpass', 'teacher');