import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { env } from "./lib/env";

export const dataRouter = createRouter({
  // Backup: Export full database schema and data
  backup: adminQuery.mutation(async () => {
    try {
      const db = getDb();
      
      // Get all table names - FIXED: using raw query properly
      const [tablesResult] = await db.execute(`SHOW TABLES`);
      const tableNames = (tablesResult as any[]).map((row: any) => Object.values(row)[0]);
      
      const backupData: any = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        tables: {}
      };
      
      // Export each table's structure and data
      for (const tableName of tableNames) {
        // Get table structure
        const [structureResult] = await db.execute(`SHOW CREATE TABLE ${tableName}`);
        const createStatement = (structureResult as any[])[0]["Create Table"];
        
        // Get all data using raw SQL
        const [dataRows] = await db.execute(`SELECT * FROM ${tableName}`);
        
        backupData.tables[tableName] = {
          createStatement: createStatement,
          data: dataRows as any[]
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
        
        // Get all existing tables
        const [tablesResult] = await db.execute(`SHOW TABLES`);
        const tableNames = (tablesResult as any[]).map((row: any) => Object.values(row)[0]);
        
        // Drop all existing tables
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
              const values = columns.map((col: string) => row[col]);
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
      const [tablesResult] = await db.execute(`SHOW TABLE STATUS`);
      let totalSize = 0;
      let totalRows = 0;
      
      for (const table of (tablesResult as any[])) {
        totalSize += table.Data_length + table.Index_length;
        totalRows += table.Rows;
      }
      
      return {
        success: true,
        tableCount: (tablesResult as any[]).length,
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