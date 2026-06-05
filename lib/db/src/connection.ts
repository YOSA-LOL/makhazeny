import mysql from "mysql2/promise";

export interface MysqlConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

export function getMysqlConfig(): MysqlConfig {
  return {
    host: process.env.MYSQL_HOST ?? process.env.DB_HOST ?? "localhost",
    user: process.env.MYSQL_USER ?? process.env.DB_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE ?? process.env.DB_DATABASE ?? "makhazeny",
    port: Number(process.env.MYSQL_PORT ?? process.env.DB_PORT ?? 3306),
  };
}

export function buildDatabaseUrl(config: MysqlConfig = getMysqlConfig()): string {
  const encodedPassword = encodeURIComponent(config.password);
  return `mysql://${config.user}:${encodedPassword}@${config.host}:${config.port}/${config.database}`;
}

const globalForPool = globalThis as unknown as { __mysqlPool?: mysql.Pool };

export function getPool(): mysql.Pool {
  if (!globalForPool.__mysqlPool) {
    const config = getMysqlConfig();
    globalForPool.__mysqlPool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: false,
    });
  }
  return globalForPool.__mysqlPool;
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const conn = await getPool().getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch {
    return false;
  }
}
