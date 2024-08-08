import Database from "better-sqlite3";

// Function to create a database connection and set up the table
function connectToDatabase() {
  const db = new Database("colleges.db");
  db.exec(
    "CREATE TABLE IF NOT EXISTS colleges (id INTEGER PRIMARY KEY, name TEXT, city TEXT, state TEXT, code TEXT, link TEXT)"
  );
  return db;
}

// Function to insert a user into the database
function insertCollege(
  name: string,
  city: string,
  state: string,
  code: string,
  link: string
) {
  const db = connectToDatabase();
  const insert = db.prepare(
    "INSERT INTO colleges (name, city, state, code, link) VALUES (?, ?,?,?,?)"
  );
  insert.run(name, city, state, code, link);
  db.close();
}

function getCollegesByPage(page: number, pageSize: number) {
  const db = connectToDatabase();
  const offset: number = (page - 1) * pageSize;
  const stmt = db.prepare("SELECT * FROM colleges LIMIT ? OFFSET ?");
  const colleges: any[] = stmt.all(pageSize, offset);

  const totalStmt = db.prepare("SELECT COUNT(*) AS total FROM colleges");
  const totalResult: any = totalStmt.get();
  const totalRecords: number = totalResult.total;

  const totalPages: number = Math.ceil(totalRecords / pageSize);

  db.close();
  return {
    totalPages,
    totalRecords,
    colleges,
  };
}

// Function to retrieve all colleges
function getAllColleges() {
  const db = connectToDatabase();
  const stmt = db.prepare("SELECT * FROM colleges");
  const rows = stmt.all();
  db.close();
  return rows;
}

export { insertCollege, getAllColleges, getCollegesByPage };
