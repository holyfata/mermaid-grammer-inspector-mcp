/**
 * Parse module test cases
 */

import type { ChildProcess } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ParseResult, ParseStatus, parseMermaid } from "./parse";

// Mock the child_process module
vi.mock("node:child_process", () => ({
	exec: vi.fn(),
}));

// Define proper types for the callback
type ExecCallback = (
	error: Error | null,
	stdout: string,
	stderr: string,
) => void;

describe("parseMermaid", () => {
	let mockExec: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Get the mocked exec function
		const childProcess = await import("node:child_process");
		mockExec = childProcess.exec as unknown as ReturnType<typeof vi.fn>;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return SUCCESS status when parsing succeeds", async () => {
		// Mock successful execution
		mockExec.mockImplementation((_command: string, callback: ExecCallback) => {
			callback(null, "success output", "");
			return {} as ChildProcess;
		});

		const result = await parseMermaid("test.mmd", "test.svg");

		expect(result.status).toBe(ParseStatus.SUCCESS);
		expect(result.message).toBeUndefined();
	});

	it("should return FAIL status and error message when parsing fails", async () => {
		const errorMessage = "Syntax error in mermaid diagram";

		mockExec.mockImplementation((_command: string, callback: ExecCallback) => {
			const error = new Error(errorMessage);
			callback(error, "", `Error: ${errorMessage}`);
			return {} as ChildProcess;
		});

		const result = await parseMermaid("invalid.mmd", "output.svg");

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toContain(errorMessage);
	});

	it("should filter out npm warn messages", async () => {
		const stderr = `npm warn deprecated package@1.0.0
npm WARN old lockfile
Error: Parse error on line 1:
Unexpected token`;

		mockExec.mockImplementation((_command: string, callback: ExecCallback) => {
			const error = new Error("Command failed");
			callback(error, "", stderr);
			return {} as ChildProcess;
		});

		const result = await parseMermaid("test.mmd", "test.svg");

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).not.toContain("npm warn");
		expect(result.message).not.toContain("npm WARN");
		expect(result.message).toContain("Error: Parse error on line 1:");
	});

	it("should properly handle stack trace information", async () => {
		const stderr = `Error: Invalid syntax
    at Parser.parse (/path/to/parser.js:123:45)
    at async processFile (/path/to/process.js:67:89)`;

		mockExec.mockImplementation((_command: string, callback: ExecCallback) => {
			const error = new Error("Command failed");
			callback(error, "", stderr);
			return {} as ChildProcess;
		});

		const result = await parseMermaid("test.mmd", "test.svg");

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe("Error: Invalid syntax");
		expect(result.message).not.toContain("at Parser.parse");
	});

	it("should use default filename parameters", async () => {
		mockExec.mockImplementation((command: string, callback: ExecCallback) => {
			expect(command).toContain("input.mmd");
			expect(command).toContain("output.svg");
			callback(null, "", "");
			return {} as ChildProcess;
		});

		await parseMermaid();

		expect(mockExec).toHaveBeenCalledWith(
			expect.stringContaining("input.mmd"),
			expect.any(Function),
		);
	});

	it("should use custom filename parameters", async () => {
		const customInput = "custom-input.mmd";
		const customOutput = "custom-output.svg";

		mockExec.mockImplementation((command: string, callback: ExecCallback) => {
			expect(command).toContain(customInput);
			expect(command).toContain(customOutput);
			callback(null, "", "");
			return {} as ChildProcess;
		});

		await parseMermaid(customInput, customOutput);

		expect(mockExec).toHaveBeenCalledWith(
			expect.stringContaining(customInput),
			expect.any(Function),
		);
	});

	it("should correctly build mmdc command", async () => {
		mockExec.mockImplementation((command: string, callback: ExecCallback) => {
			expect(command).toMatch(/npx mmdc -i .+ -o .+/);
			callback(null, "", "");
			return {} as ChildProcess;
		});

		await parseMermaid("test.mmd", "test.svg");

		expect(mockExec).toHaveBeenCalled();
	});

	it("should handle empty error output", async () => {
		mockExec.mockImplementation((_command: string, callback: ExecCallback) => {
			const error = new Error("Unknown error");
			callback(error, "", "");
			return {} as ChildProcess;
		});

		const result = await parseMermaid("test.mmd", "test.svg");

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe("Unknown error");
	});

	it("should handle stderr-only scenarios", async () => {
		const stderrMessage = "Error: Mermaid parsing failed";

		mockExec.mockImplementation((_command: string, callback: ExecCallback) => {
			const error = new Error();
			callback(error, "", stderrMessage);
			return {} as ChildProcess;
		});

		const result = await parseMermaid("test.mmd", "test.svg");

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe(stderrMessage);
	});

	it("should handle complex error output filtering", async () => {
		const complexStderr = `npm warn deprecated package@1.0.0: This package is deprecated
npm WARN old lockfile The package-lock.json file was created with an old version
Error: Parse error on line 5:
...graph TD
-----------^
Expecting 'NEWLINE', 'SPACE', 'GRAPH', got 'MINUS'
    at Parser.parseError (/node_modules/mermaid/dist/mermaid.js:1234:56)
    at Parser.parse (/node_modules/mermaid/dist/mermaid.js:2345:67)
    at async generateSVG (/node_modules/@mermaid-js/mermaid-cli/src/index.js:123:45)`;

		mockExec.mockImplementation((_command: string, callback: ExecCallback) => {
			const error = new Error("Command failed");
			callback(error, "", complexStderr);
			return {} as ChildProcess;
		});

		const result = await parseMermaid("test.mmd", "test.svg");

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toContain("Error: Parse error on line 5:");
		expect(result.message).toContain(
			"Expecting 'NEWLINE', 'SPACE', 'GRAPH', got 'MINUS'",
		);
		expect(result.message).not.toContain("npm warn");
		expect(result.message).not.toContain("at Parser.parseError");
	});
});

describe("ParseStatus enum", () => {
	it("should have correct enum values", () => {
		expect(ParseStatus.SUCCESS).toBe(0);
		expect(ParseStatus.FAIL).toBe(1);
	});
});

describe("ParseResult interface", () => {
	it("should support success result", () => {
		const result: ParseResult = {
			status: ParseStatus.SUCCESS,
		};

		expect(result.status).toBe(ParseStatus.SUCCESS);
		expect(result.message).toBeUndefined();
	});

	it("should support failure result", () => {
		const result: ParseResult = {
			status: ParseStatus.FAIL,
			message: "Test error message",
		};

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe("Test error message");
	});
});
