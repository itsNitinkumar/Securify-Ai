#!/usr/bin/env node

/**
 * Fix image fields in findings
 * Rename 'image' to 'imageKey' for consistency
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixImageFields() {
  try {
    console.log('Checking findings with image fields...\n');

    // Get all findings with steps
    const result = await pool.query(`
      SELECT id, title, steps_to_reproduce
      FROM findings
      WHERE steps_to_reproduce IS NOT NULL
    `);

    let fixedCount = 0;

    for (const finding of result.rows) {
      let needsUpdate = false;
      const steps = finding.steps_to_reproduce;

      if (!Array.isArray(steps)) continue;

      // Check if any step has 'image' field instead of 'imageKey'
      const updatedSteps = steps.map(step => {
        if (step.image && !step.imageKey) {
          console.log(`Finding #${finding.id}: Renaming 'image' to 'imageKey'`);
          needsUpdate = true;
          return {
            ...step,
            imageKey: step.image,
            image: undefined
          };
        }
        return step;
      });

      if (needsUpdate) {
        await pool.query(
          'UPDATE findings SET steps_to_reproduce = $1 WHERE id = $2',
          [JSON.stringify(updatedSteps), finding.id]
        );
        fixedCount++;
        console.log(`✓ Fixed finding #${finding.id}\n`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} findings`);
    console.log(`✓ All findings now use 'imageKey' field`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixImageFields();
