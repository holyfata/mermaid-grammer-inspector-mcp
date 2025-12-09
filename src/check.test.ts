/**
 * Check module test cases
 */

import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkMermaid } from "./check";
import { ParseStatus } from "./parse";

// Mock fs module
vi.mock("node:fs", () => ({
	default: {
		writeFileSync: vi.fn(),
	},
}));

// Mock parse module
vi.mock("./parse", () => ({
	parseMermaid: vi.fn(),
	ParseStatus: {
		SUCCESS: 0,
		FAIL: 1,
	},
}));

// Import the mocked modules
const mockFs = vi.mocked(fs);

describe("checkMermaid", () => {
	let mockParseMermaid: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Import the parse module to get the mocked function
		const parseModule = await import("./parse");
		mockParseMermaid = parseModule.parseMermaid as unknown as ReturnType<
			typeof vi.fn
		>;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should successfully check valid Mermaid syntax", async () => {
		const validMermaidText = `
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
    `;

		// Mock successful parsing
		vi.mocked(mockParseMermaid).mockResolvedValue({
			status: ParseStatus.SUCCESS,
		});

		const result = await checkMermaid(validMermaidText);

		expect(mockFs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining("input.mmd"),
			validMermaidText,
			{ encoding: "utf-8" },
		);
		expect(mockParseMermaid).toHaveBeenCalled();
		expect(result.status).toBe(ParseStatus.SUCCESS);
		expect(result.message).toBeUndefined();
	});

	it("should detect invalid Mermaid syntax", async () => {
		const invalidMermaidText = `
flowchart TD
    A[Start] --> 
    B --> C[End]
    `;

		const errorMessage = "Parse error: Invalid syntax";

		// Mock failed parsing
		vi.mocked(mockParseMermaid).mockResolvedValue({
			status: ParseStatus.FAIL,
			message: errorMessage,
		});

		const result = await checkMermaid(invalidMermaidText);

		expect(mockFs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining("input.mmd"),
			invalidMermaidText,
			{ encoding: "utf-8" },
		);
		expect(mockParseMermaid).toHaveBeenCalled();
		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe(errorMessage);
	});

	it("should handle empty Mermaid text", async () => {
		const emptyText = "";

		const result = await checkMermaid(emptyText);

		// Should not call writeFileSync or parseMermaid for empty input
		expect(mockFs.writeFileSync).not.toHaveBeenCalled();
		expect(mockParseMermaid).not.toHaveBeenCalled();
		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe("Input cannot be empty or contain only whitespace");
	});

	it("should handle whitespace-only text", async () => {
		const whitespaceText = "   \n\t\r\n   ";

		const result = await checkMermaid(whitespaceText);

		// Should not call writeFileSync or parseMermaid for whitespace-only input
		expect(mockFs.writeFileSync).not.toHaveBeenCalled();
		expect(mockParseMermaid).not.toHaveBeenCalled();
		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe("Input cannot be empty or contain only whitespace");
	});

	it("should handle non-string input", async () => {
		const result = await checkMermaid(null as any);

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toBe("Input must be a string");
	});

	it("should handle Mermaid text with special characters", async () => {
		const specialCharText = `
flowchart TD
    A["Special Characters"] --> B[Normal Node]
    B --> C["Unicode Node"]
    `;

		vi.mocked(mockParseMermaid).mockResolvedValue({
			status: ParseStatus.SUCCESS,
		});

		const result = await checkMermaid(specialCharText);

		expect(mockFs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining("input.mmd"),
			specialCharText,
			{ encoding: "utf-8" },
		);
		expect(result.status).toBe(ParseStatus.SUCCESS);
	});

	it("should handle file write failure", async () => {
		const mermaidText = "flowchart TD\n    A --> B";

		// Mock file write error
		mockFs.writeFileSync.mockImplementation(() => {
			throw new Error("Permission denied");
		});

		const result = await checkMermaid(mermaidText);

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toContain("Unable to write temporary file");
		expect(result.message).toContain("Permission denied");
	});

	it("should handle non-Error type exceptions", async () => {
		const mermaidText = "flowchart TD\n    A --> B";

		// Mock non-Error exception
		mockFs.writeFileSync.mockImplementation(() => {
			throw "String error";
		});

		const result = await checkMermaid(mermaidText);

		expect(result.status).toBe(ParseStatus.FAIL);
		expect(result.message).toContain("Unable to write temporary file");
		expect(result.message).toContain("File write failed");
	});

	it("should use correct file path", async () => {
		const mermaidText = "flowchart TD\n    A --> B";

		vi.mocked(mockParseMermaid).mockResolvedValue({
			status: ParseStatus.SUCCESS,
		});

		await checkMermaid(mermaidText);

		const writeCall = mockFs.writeFileSync.mock.calls[0];
		const filePath = writeCall[0] as string;

		expect(path.basename(filePath)).toBe("input.mmd");
		expect(filePath).toContain("src");
	});

	it("should write file using UTF-8 encoding", async () => {
		const mermaidText = "flowchart TD\n    A --> B";

		vi.mocked(mockParseMermaid).mockResolvedValue({
			status: ParseStatus.SUCCESS,
		});

		await checkMermaid(mermaidText);

		expect(mockFs.writeFileSync).toHaveBeenCalledWith(
			expect.any(String),
			mermaidText,
			{ encoding: "utf-8" },
		);
	});
});
