import * as vscode from 'vscode';

class CtrlSymbols {
    public static readonly newLineCode = '\n'.charCodeAt(0);
    public static readonly tabCode = '\t'.charCodeAt(0);
    public static readonly spaceCode = ' '.charCodeAt(0);
}
export class CtrlCodeFormatter implements vscode.DocumentFormattingEditProvider {
    private iterTabs = 0;
    private document: vscode.TextDocument | undefined;
    private bufferChanges: vscode.TextEdit[] = [];
    private lineText = '';
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] | undefined {
        this.initVars();
        this.document = document;
        let isComment = false;
        let isLiteralString = false;
        for (let i = 0; i < this.document.lineCount; i++) {
            let isCommentString = false;
            const line = this.document.lineAt(i);
            this.lineText = line.text;
            let countCharsInLine = this.lineText.length;
            for (let j = 0; j <= countCharsInLine; j++) {
                if (j == 0 && !(isLiteralString || isComment)) {
                    if (this.iterTabs > 0 && line.text.slice(0, line.firstNonWhitespaceCharacterIndex) != '\t'.repeat(this.iterTabs)
                        && line.text.charAt(line.firstNonWhitespaceCharacterIndex) != '}') {
                        this.bufferChanges.push(vscode.TextEdit.replace(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.firstNonWhitespaceCharacterIndex)), '\t'.repeat(this.iterTabs)));
                        this.lineText = '\t'.repeat(this.iterTabs) + this.lineText.slice(line.firstNonWhitespaceCharacterIndex, this.lineText.length);
                        countCharsInLine = this.lineText.length;
                    }
                }
                const char = this.lineText.charAt(j);
                switch (char) {
                    case '"':
                        if (isLiteralString) {
                            let charPrev = this.lineText.charAt(j - 1);
                            if (charPrev != '\\') {
                                isLiteralString = false;
                            }
                        }
                        else {
                            isLiteralString = true;
                        }
                        break;
                    case '/':
                        if (this.lineText.length > j) {
                            let charNext = this.lineText.charAt(j + 1);
                            if (charNext == '/') {
                                isCommentString = true;
                            }
                            else if (charNext == '*') {
                                isComment = true;
                            }
                        }
                        break;
                    case '*':
                        if (this.lineText.length > j && isComment) {
                            let charNext = this.lineText.charAt(j + 1);
                            if (charNext == '/') {
                                isComment = false;
                            }
                        }
                        break;
                    case '{':
                        if (isLiteralString || isComment) break;
                        this.formatScope(i, j, this.lineText, '\t'.repeat(this.iterTabs));
                        this.iterTabs++;
                        break;
                    case '}':
                        if (isLiteralString || isComment) break;
                        this.iterTabs--;
                        this.formatScope(i, j, this.lineText, '\t'.repeat(this.iterTabs));
                        break;
                    case '=':
                        if (isLiteralString || isComment) break;
                        this.addSpaces(i, j);
                        break;
                    // case '(':
                    // case ')':
                    //     if (isLiteralString || isComment) break;
                    //     this.replaceSpaces(i, j);
                    //     break;
                    default:
                        break;
                }
                if (isCommentString) continue;
            }

        }
        if (this.iterTabs != 0) {
            return [];
        }
        return this.bufferChanges;
    }

    private initVars() {
        this.iterTabs = 0;
        this.bufferChanges = [];
    }

    private formatScope(lineNumber: number, iterChar: number, text: string, insertString: string) {
        if (!this.document) return;
        const endDeletePos = iterChar;
        while (iterChar > 0) {
            let prevChar = text.charCodeAt(iterChar - 1);
            if (prevChar > 32) {
                this.bufferChanges.push(vscode.TextEdit.insert(new vscode.Position(lineNumber, iterChar), '\n'));
                break;
            }
            iterChar--;
        }
        this.bufferChanges.push(vscode.TextEdit.replace(new vscode.Range(new vscode.Position(lineNumber, iterChar), new vscode.Position(lineNumber, endDeletePos)), insertString));
    }

    private addSpaces(lineNumber: number, iterChar: number) {
        if (this.lineText.length > iterChar) {
            const nextChar = this.lineText.charAt(iterChar + 1);
            const idx = nextChar.match(/=|\+|-|\*|\/|\s/);
            if (!idx) {
                this.lineText = this.lineText.slice(0, iterChar) + ' ' + this.lineText.slice(iterChar + 1, this.lineText.length);
                this.bufferChanges.push(vscode.TextEdit.insert(new vscode.Position(lineNumber, iterChar + 1), ' '));
            }
        }
        if (iterChar > 1) {
            const prevChar = this.lineText.charAt(iterChar - 1);
            const idx = prevChar.match(/=|\+|-|\*|\/|\s/);
            if (!idx) {
                this.lineText = this.lineText.slice(0, iterChar - 1) + ' ' + this.lineText.slice(iterChar, this.lineText.length);
                this.bufferChanges.push(vscode.TextEdit.insert(new vscode.Position(lineNumber, iterChar), ' '));
            }
        }
    }

    private replaceSpaces(lineNumber: number, iterChar: number) {
        while (this.lineText.length > iterChar) {
            const nextChar = this.lineText.charAt(iterChar + 1);
            if (nextChar == ' ' || nextChar == '\t') {
                this.lineText = this.lineText.slice(0, iterChar) + this.lineText.slice(iterChar, this.lineText.length);
                this.bufferChanges.push(vscode.TextEdit.delete(new vscode.Range(new vscode.Position(lineNumber, iterChar), new vscode.Position(lineNumber, iterChar))));
            }
            else {
                break;
            }
            iterChar++;
        }
        while (iterChar > 1) {
            const prevChar = this.lineText.charAt(iterChar - 1);
            if (prevChar == ' ' || prevChar == '\t') {
                this.lineText = this.lineText.slice(0, iterChar - 1) + this.lineText.slice(iterChar, this.lineText.length);
                this.bufferChanges.push(vscode.TextEdit.delete(new vscode.Range(new vscode.Position(lineNumber, iterChar - 1), new vscode.Position(lineNumber, iterChar - 1))));
            }
            else {
                break;
            }
            iterChar--;
        }
    }
}