// Context assembly for AgenticLab - bounded context from project source
// Generic implementation: uses relative paths resolved against workspace root
// Follows C03 baseline policy constraints:
// - allowedSourceRoots: relative path roots under workspace
// - maxSourceFiles: 8
// - maxSourceLines: 240
// - maxKnowledgeRecords: 5
// - maxKnowledgeLines: 120

import fs from "node:fs";
import path from "node:path";

/**
 * Assembles bounded context from project source modules.
 * Source root is resolved relative to workspace root per policy.
 * 
 * @param {Object} options - assembly options
 * @param {string} options.sourceRoot - relative path to source root (default "src")
 * @param {number} options.maxSourceFiles - max source files to include (default 8)
 * @param {number} options.maxSourceLines - max lines per file (default 240)
 * @returns {Object} assembled context object
 */
export function assembleContext(options = {}) {
  const sourceRoot = options.sourceRoot || "src";
  const maxSourceFiles = options.maxSourceFiles || 8;
  const maxSourceLines = options.maxSourceLines || 240;

  const resolvedSourceRoot = path.resolve(sourceRoot);
  
  // Collect source files from the allowed root (relative to workspace)
  const sourceFiles = [];
  try {
    for (const entry of fs.readdirSync(resolvedSourceRoot)) {
      const fullPath = path.join(resolvedSourceRoot, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && (entry.endsWith(".mjs") || entry.endsWith(".js"))) {
        sourceFiles.push(path.relative(process.cwd(), fullPath));
        if (sourceFiles.length >= maxSourceFiles) break;
      }
    }
  } catch (e) {
    // Source root may not exist in generic workspaces
  }
  
  const context = {
    sourceRoot,
    resolvedSourceRoot,
    sourceFiles,
    maxSourceFiles,
    maxSourceLines,
    maxKnowledgeRecords: 5,
    maxKnowledgeLines: 120
  };
  
  return context;
}

/**
 * Validates assembled context against policy constraints.
 */
export function validateContext(context = {}) {
  const errors = [];
  
  if (context.sourceFiles?.length > 8) {
    errors.push(`Too many source files: ${context.sourceFiles.length} (max 8)`);
  }
  
  if (context.maxSourceLines > 240) {
    errors.push(`Source files exceed line limit: ${context.maxSourceLines} lines (max 240)`);
  }
  
  if (context.maxKnowledgeRecords > 5) {
    errors.push(`Too many knowledge records: ${context.maxKnowledgeRecords} (max 5)`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}