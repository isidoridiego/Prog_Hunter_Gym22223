import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3307),
  user: process.env.DB_USER ?? 'hunter_gym',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'hunter_gym',
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: false,
  dateStrings: ['DATE'],
  timezone: 'Z',
  flags: ['FOUND_ROWS'],
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export type DbConnection = Pool | PoolConnection;

export async function query<T extends RowDataPacket>(
  connection: DbConnection,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await connection.query(sql, params as never[]);
  return rows as T[];
}

export async function execute(
  connection: DbConnection,
  sql: string,
  params: unknown[] = [],
): Promise<{ affectedRows: number; insertId: number }> {
  const [result] = await connection.query(sql, params as never[]);
  const header = result as ResultSetHeader;
  return { affectedRows: header.affectedRows, insertId: header.insertId };
}

export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
