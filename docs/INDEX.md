# Documentation Index

Complete documentation for Riksdagsgranskning - Swedish Parliamentary Scrutiny Application

---

## 📚 Core Documentation

### [README.md](../README.md)
Start here! Overview of the project, tech stack, and quick start guide.

### [API.md](API.md)
**Complete API reference** for all admin endpoints:
- Data import endpoints (voteringar, CSV, person.sql)
- Analysis endpoints
- Database endpoints
- Error handling and examples

### [DATABASE.md](DATABASE.md)
**Complete database schema and structure**:
- All production tables (voteringar, anföranden, motioner, frågor, interpellationer, betänkanden, ledamöter)
- Import tables and temporary staging areas
- Data statistics and validation
- Foreign key constraints
- Indexing strategy
- Performance considerations

---

## 🚀 Setup & Installation

### [SETUP.md](SETUP.md)
Detailed step-by-step installation instructions

### [SUPABASE_SETUP_INSTRUCTIONS.md](SUPABASE_SETUP_INSTRUCTIONS.md)
Specific Supabase PostgreSQL configuration

### [QUICKSTART.md](QUICKSTART.md)
Quick start guide for developers

### [QUICK_DATABASE_SETUP.md](QUICK_DATABASE_SETUP.md)
Fastest way to get database running

---

## 📖 Development Guides

### [DEVELOPMENT.md](DEVELOPMENT.md)
Development best practices and guidelines

### [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
High-level project overview and architecture

### [RIKSDAGEN_API_GUIDE.md](RIKSDAGEN_API_GUIDE.md)
Guide to using the Riksdagen open data API

---

## 📋 Planning & Progress

### [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)
Summary of completed work and next steps

### [WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md)
Week 1 completion status

### [WEEK2_PLAN.md](WEEK2_PLAN.md)
Week 2 implementation plan

### [WEEK3_PLAN.md](WEEK3_PLAN.md)
Week 3 objectives and milestones

---

## 🎯 Quick Navigation by Role

### 👨‍💻 For Developers
1. [QUICKSTART.md](QUICKSTART.md)
2. [DEVELOPMENT.md](DEVELOPMENT.md)
3. [API.md](API.md) & [DATABASE.md](DATABASE.md)

### 🔧 For DevOps/Infrastructure
1. [SUPABASE_SETUP_INSTRUCTIONS.md](SUPABASE_SETUP_INSTRUCTIONS.md)
2. [DATABASE.md](DATABASE.md)
3. [API.md](API.md)

### 📊 For Data Engineers
1. [DATABASE.md](DATABASE.md)
2. [API.md](API.md)
3. [RIKSDAGEN_API_GUIDE.md](RIKSDAGEN_API_GUIDE.md)

### 📈 For Project Managers
1. [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
2. [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)
3. Weekly plans

---

## 📊 Current Database Status (2025-10-20)

**Production Tables:**
- ✅ voteringar: 1,006,865 rows (2021-2025)
- ✅ anföranden: 147,359 rows (2010-2025)
- ✅ motioner: 56,745 rows (2010-2025)
- ✅ frågor: 60,830 rows (2010-2025)
- ✅ interpellationer: 18,212 rows (2010-2025)
- ✅ betänkanden: 1,135 rows (2022-2025)
- ✅ ledamöter: 2,086 rows (1990+)
- ✅ personuppdrag: 31,305 rows (1990+)

**Total: 1,324,537 production records**

---

Last updated: 2025-10-20
