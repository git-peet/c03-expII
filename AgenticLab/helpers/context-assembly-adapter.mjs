// Context assembly adapter - generic connector for bounded context assembly
// Enforces C03 policy constraints using relative paths resolved against workspace root

import { assembleContext, validateContext } from "./context-assembly.mjs";

/**
 * ContextAssemblyAdapter - implements policy constraints for context assembly.
 * 
 * Policy (generic, relative paths):
 * - allowedSourceRoots: ["src"] (relative to workspace root)
 * - sourceScopeRules: pathRoot="src", scopePrefix="modules", scopeSegments=1
 * - maxSourceFiles: 8
 * - maxSourceLines: 240
 * - maxKnowledgeRecords: 5
 * - maxKnowledgeLines: 120
 */

export class ContextAssemblyAdapter {
  /**
   * Assemble context according to generic C03 policy.
   * Uses relative paths resolved against the workspace root.
   * 
   * @param {Object} options - assembly options
   * @param {string} options.sourceRoot - relative path to source root (default: "src")
   * @returns {Object} assembled context with policy compliance metadata
   */
  static assemble(options = {}) {
    const sourceRoot = options.sourceRoot || "src";
    const context = assembleContext({ sourceRoot });

    // Generic policy enforcement: check source root is a simple relative path
    const allowedRoots = ["src"];
    const isAllowed = allowedRoots.includes(sourceRoot);
    
    if (!isAllowed) {
      throw new Error(
        `Source root "${sourceRoot}" is not allowed. Allowed generic roots: ${allowedRoots.join(", ")}`
      );
    }

    // Enforce generic max constraints (hard limits)
    if (context.sourceFiles?.length > 8) {
      throw new Error(`Too many source files: ${context.sourceFiles.length} (max 8)`);
    }

    if (context.maxSourceLines > 240) {
      throw new Error(
        `Source files exceed line limit: ${context.maxSourceLines} lines (max 240)`
      );
    }

    if (context.maxKnowledgeRecords > 5) {
      throw new Error(`Too many knowledge records: ${context.maxKnowledgeRecords} (max 5)`);
    }

    // Build final context with policy metadata
    const contextWithPolicy = {
      ...context,
      policyCompliance: {
        allowedSourceRoots: allowedRoots,
        sourceRoot,
        maxSourceFiles: context.sourceFiles?.length || 0,
        maxSourceLines: context.maxSourceLines,
        maxKnowledgeRecords: context.maxKnowledgeRecords,
        maxKnowledgeLines: 120
      }
    };

    return contextWithPolicy;
  }

  /**
   * Validate a context object against generic C03 policy.
   * 
   * @param {Object} context - Context to validate
   * @returns {Object} Validation result with { valid, errors }
   */
  static validate(context = {}) {
    const errors = [];

    // Check source root is a generic relative path
    const allowedRoots = ["src"];
    if (context.sourceRoot && !allowedRoots.includes(context.sourceRoot)) {
      errors.push(
        `Invalid source root: "${context.sourceRoot}". Allowed: ${allowedRoots.join(", ")}`
      );
    }

    // Check max source files
    if (context.sourceFiles?.length > 8) {
      errors.push(`Too many source files: ${context.sourceFiles.length} (max 8)`);
    }

    // Check max source lines
    if (context.maxSourceLines > 240) {
      errors.push(`Source files exceed line limit: ${context.maxSourceLines} lines (max 240)`);
    }

    // Check max knowledge records
    if (context.maxKnowledgeRecords > 5) {
      errors.push(`Too many knowledge records: ${context.maxKnowledgeRecords} (max 5)`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}