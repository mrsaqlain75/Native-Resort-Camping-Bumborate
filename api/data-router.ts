import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { spawn } from "child_process";
import { promisify } from "util";
import { env } from "./lib/env";

export const dataRouter = createRouter({
  // Backup: Export full database schema and data
  backup: adminQuery.mutation(async () => {
    try {
      const db = getDb();
      
      // Get all table names
      const tables = await db.execute(`SHOW TABLES`);
      const tableNames = tables[0].map((row: any) => Object.values(row)[0]);
      
      const backupData: any = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        tables: {}
      };
      
      // Export each table's structure and data
      for (const tableName of tableNames) {
        // Get table structure
        const structure = await db.execute(`SHOW CREATE TABLE ${tableName}`);
        
        // Get all data
        const data = await db.select().from(eval(`schema.${tableName}`));
        
        backupData.tables[tableName] = {
          createStatement: structure[0][0]["Create Table"],
          data: data
        };
      }
      
      return {
        success: true,
        backupData: JSON.stringify(backupData, null, 2)
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),
  
  // Restore: Import full database from backup file
  restore: adminQuery
    .input((val: any) => val)
    .mutation(async ({ input }) => {
      try {
        const { backupData } = input;
        const parsedData = typeof backupData === "string" ? JSON.parse(backupData) : backupData;
        
        const db = getDb();
        
        // Disable foreign key checks temporarily
        await db.execute(`SET FOREIGN_KEY_CHECKS = 0`);
        
        // Drop all existing tables
        const tables = await db.execute(`SHOW TABLES`);
        const tableNames = tables[0].map((row: any) => Object.values(row)[0]);
        
        for (const tableName of tableNames) {
          await db.execute(`DROP TABLE IF EXISTS ${tableName}`);
        }
        
        // Recreate and restore each table
        for (const [tableName, tableData] of Object.entries(parsedData.tables) as any) {
          // Recreate table structure
          await db.execute(tableData.createStatement);
          
          // Insert data if any
          if (tableData.data && tableData.data.length > 0) {
            const columns = Object.keys(tableData.data[0]);
            const placeholders = columns.map(() => "?").join(",");
            const insertQuery = `INSERT INTO ${tableName} (${columns.join(",")}) VALUES (${placeholders})`;
            
            for (const row of tableData.data) {
              const values = columns.map(col => row[col]);
              await db.execute(insertQuery, values);
            }
          }
        }
        
        // Re-enable foreign key checks
        await db.execute(`SET FOREIGN_KEY_CHECKS = 1`);
        
        return { success: true, message: "Database restored successfully" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),
  
  // Get backup size info
  backupInfo: adminQuery.query(async () => {
    try {
      const db = getDb();
      const tables = await db.execute(`SHOW TABLE STATUS`);
      let totalSize = 0;
      let totalRows = 0;
      
      for (const table of tables[0] as any) {
        totalSize += table.Data_length + table.Index_length;
        totalRows += table.Rows;
      }
      
      return {
        success: true,
        tableCount: tables[0].length,
        totalRows,
        totalSize: formatBytes(totalSize)
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}