# Course Work Management System

Система управління курсовими роботами - це веб-додаток, розроблений для спрощення процесу управління та контролю курсових робіт між студентами та викладачами.

## Особливості

- Авторизація та автентифікація користувачів
- Різні ролі для студентів та викладачів
- Динамічний інтерфейс з привітаннями залежно від часу доби
- Завантаження та управління курсовими роботами
- Система оцінювання та відгуків

## Технології

- Frontend: React.js
- Backend: Node.js, Express
- База даних: PostgreSQL
- Автентифікація: JWT
- Стилізація: CSS

## Встановлення

1. Клонуйте репозиторій:
```bash
git clone https://github.com/poson1o2013/course_work_tracker.git
```

2. Встановіть залежності для backend:
```bash
npm install
```

3. Перейдіть до директорії client та встановіть залежності для frontend:
```bash
cd client
npm install
```

4. Створіть файл .env в кореневій директорії та налаштуйте змінні середовища:
```
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=course_work_db
JWT_SECRET=your_jwt_secret
```

5. Створіть базу даних PostgreSQL та імпортуйте структуру:
```bash
psql -U your_db_user -d course_work_db -f database.sql
```

6. Запустіть сервер:
```bash
npm start
```

7. В окремому терміналі запустіть клієнтську частину:
```bash
cd client
npm start
```

## Ліцензія

MIT 