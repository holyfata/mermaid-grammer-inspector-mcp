/**
 * Integration test cases
 * Test end-to-end functionality of the Mermaid syntax checker
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkMermaid } from "./check";
import { ParseStatus } from "./parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Mermaid syntax checker integration tests", () => {
	const fixturesDir = path.join(__dirname, "fixtures");

	beforeEach(() => {
		// Clean up any existing temporary files
		const tempFiles = ["input.mmd", "output.svg"];
		tempFiles.forEach((file) => {
			const filePath = path.join(__dirname, file);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		});
	});

	afterEach(() => {
		// Clean up temporary files created during tests
		const tempFiles = ["input.mmd", "output.svg"];
		tempFiles.forEach((file) => {
			const filePath = path.join(__dirname, file);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		});
	});

	describe("Valid Mermaid diagram tests", () => {
		it("should successfully validate flowchart", async () => {
			const rightMmdPath = path.join(fixturesDir, "right.mmd");
			const mermaidContent = fs.readFileSync(rightMmdPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
			expect(result.message).toBeUndefined();
		});

		it("should successfully validate sequence diagram", async () => {
			const sequenceDiagramPath = path.join(
				fixturesDir,
				"sequence-diagram.mmd",
			);
			const mermaidContent = fs.readFileSync(sequenceDiagramPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
			expect(result.message).toBeUndefined();
		});

		it("should successfully validate class diagram", async () => {
			const classDiagramPath = path.join(fixturesDir, "class-diagram.mmd");
			const mermaidContent = fs.readFileSync(classDiagramPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
			expect(result.message).toBeUndefined();
		});

		it("should successfully validate gantt chart", async () => {
			const ganttChartPath = path.join(fixturesDir, "gantt-chart.mmd");
			const mermaidContent = fs.readFileSync(ganttChartPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
			expect(result.message).toBeUndefined();
		});

		it("should successfully validate state diagram", async () => {
			const stateDiagramPath = path.join(fixturesDir, "state-diagram.mmd");
			const mermaidContent = fs.readFileSync(stateDiagramPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
			expect(result.message).toBeUndefined();
		});

		it("should successfully validate ER diagram", async () => {
			const erDiagramPath = path.join(fixturesDir, "er-diagram.mmd");
			const mermaidContent = fs.readFileSync(erDiagramPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
			expect(result.message).toBeUndefined();
		});
	});

	describe("Invalid Mermaid diagram tests", () => {
		it("should detect syntax errors in flowchart", async () => {
			const wrongMmdPath = path.join(fixturesDir, "wrong.mmd");
			const mermaidContent = fs.readFileSync(wrongMmdPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.FAIL);
			expect(result.message).toBeDefined();
			expect(typeof result.message).toBe("string");
		});

		it("should detect syntax errors in diagram", async () => {
			const syntaxErrorPath = path.join(fixturesDir, "syntax-error.mmd");
			const mermaidContent = fs.readFileSync(syntaxErrorPath, "utf-8");

			const result = await checkMermaid(mermaidContent);

			expect(result.status).toBe(ParseStatus.FAIL);
			expect(result.message).toBeDefined();
			expect(typeof result.message).toBe("string");
		});

		it("should handle empty content", async () => {
			const result = await checkMermaid("");

			expect(result.status).toBe(ParseStatus.FAIL);
			expect(result.message).toBeDefined();
		});

		it("should handle invalid diagram types", async () => {
			const invalidContent = `
invalidDiagram
    A --> B
    B --> C
      `;

			const result = await checkMermaid(invalidContent);

			expect(result.status).toBe(ParseStatus.FAIL);
			expect(result.message).toBeDefined();
		});
	});

	describe("Edge case tests", () => {
		it("should handle very long diagram content", async () => {
			let longContent = "flowchart TD\n";
			for (let i = 0; i < 100; i++) {
				longContent += `    A${i}[Node ${i}] --> A${i + 1}[Node ${i + 1}]\n`;
			}

			const result = await checkMermaid(longContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
		});

		it("should handle content with special characters", async () => {
			const specialContent = `
flowchart TD
    A["Unicode Characters"] --> B["emoji 🚀💻"]
    B --> C["Simple Test"]
    C --> D["End Node"]
      `;

			const result = await checkMermaid(specialContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
		});

		it("should handle content with only whitespace characters", async () => {
			const whitespaceContent = "   \n\t\r\n   \t   \n";

			const result = await checkMermaid(whitespaceContent);

			expect(result.status).toBe(ParseStatus.FAIL);
			expect(result.message).toBeDefined();
		});

		it("should handle diagrams with comments", async () => {
			const commentContent = `
%% This is a comment
flowchart TD
    %% Start node
    A[Start] --> B{Decision}
    %% Branch handling
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    %% End
    C --> E[End]
    D --> E
      `;

			const result = await checkMermaid(commentContent);

			expect(result.status).toBe(ParseStatus.SUCCESS);
		});
	});

	describe("File operation tests", () => {
		it("should create and clean up temporary files", async () => {
			const inputFilePath = path.join(__dirname, "input.mmd");
			const outputFilePath = path.join(__dirname, "output.svg");

			// Ensure files don't exist
			expect(fs.existsSync(inputFilePath)).toBe(false);
			expect(fs.existsSync(outputFilePath)).toBe(false);

			const testContent = `
flowchart TD
    A --> B
      `;

			await checkMermaid(testContent);

			// Check if temporary input file was created
			expect(fs.existsSync(inputFilePath)).toBe(true);

			// Verify file content
			const fileContent = fs.readFileSync(inputFilePath, "utf-8");
			expect(fileContent).toBe(testContent);
		});

		it("should correctly handle file encoding", async () => {
			const unicodeContent = `
flowchart TD
    A["Test Unicode 🌟"] --> B["Ελληνικά αβγ"]
    B --> C["العربية ١٢٣"]
    C --> D["русский язык"]
      `;

			const result = await checkMermaid(unicodeContent);

			const inputFilePath = path.join(__dirname, "input.mmd");
			const fileContent = fs.readFileSync(inputFilePath, "utf-8");

			expect(fileContent).toBe(unicodeContent);
			expect(result.status).toBe(ParseStatus.SUCCESS);
		});
	});

	describe("Performance tests", () => {
		it("should complete check within reasonable time", async () => {
			const startTime = Date.now();

			const testContent = `
flowchart TD
    A[Start] --> B{Check Condition}
    B -->|Met| C[Execute Operation]
    B -->|Not Met| D[Skip Operation]
    C --> E[Log Result]
    D --> E
    E --> F[End]
      `;

			await checkMermaid(testContent);

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Check should complete within 5 seconds
			expect(duration).toBeLessThan(5000);
		});
	});
});
