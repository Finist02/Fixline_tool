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
            for (let j = 0; j < countCharsInLine; j++) {
                if (j == 0 && !(isLiteralString || isComment || this.lineText.startsWith('//') || this.lineText.startsWith('/*')
                || this.lineText.match(/\s*(\"|\+|\))/))) {
                    if (i > 0 && (this.document.lineAt(i - 1).text.endsWith('(') || this.document.lineAt(i).text.match(/\s*,/))) {

                    }
                    else if (this.iterTabs > 0 && line.text.slice(0, line.firstNonWhitespaceCharacterIndex) != '\t'.repeat(this.iterTabs)
                        && line.text.charAt(line.firstNonWhitespaceCharacterIndex) != '}') {
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
                        this.formatScope(i, j, '\t'.repeat(this.iterTabs));
                        this.iterTabs++;
                        break;
                    case '}':
                        if (isLiteralString || isComment) break;
                        this.iterTabs--;
                        this.formatScope(i, j, '\t'.repeat(this.iterTabs));
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
                if (isCommentString) {
                    break;
                }
            }
            if (this.lineText != line.text) {
                this.bufferChanges.push(vscode.TextEdit.replace(line.range, this.lineText));
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

    private formatScope(lineNumber: number, iterChar: number, insertString: string) {
        if (!this.document) return;
        let endDeletePos = iterChar;
        while (iterChar > 0) {
            iterChar--;
            let prevChar = this.lineText.charCodeAt(iterChar - 1);
            if (prevChar > 32) {
                this.lineText = this.lineText.slice(0, iterChar) + '\n' + this.lineText.slice(iterChar, this.lineText.length);
                endDeletePos++;
                iterChar++;
                break;
            }
        }
        this.lineText = this.lineText.slice(0, iterChar) + insertString + this.lineText.slice(endDeletePos, this.lineText.length);
    }

    private addSpaces(lineNumber: number, iterChar: number) {
        if (this.lineText.length > iterChar) {
            const nextChar = this.lineText.charAt(iterChar + 1);
            const idx = nextChar.match(/=|\+|-|\*|\/|\s|<|>|\!/);
            if (!idx) {
                this.lineText = this.lineText.slice(0, iterChar + 1) + ' ' + this.lineText.slice(iterChar + 1, this.lineText.length);
            }
        }
        if (iterChar > 1) {
            const prevChar = this.lineText.charAt(iterChar - 1);
            const idx = prevChar.match(/=|\+|-|\*|\/|\s|<|>|\!/);
            if (!idx) {
                this.lineText = this.lineText.slice(0, iterChar) + ' ' + this.lineText.slice(iterChar, this.lineText.length);
            }
        }
    }

    private replaceSpaces(lineNumber: number, iterChar: number) {
        const startChar = iterChar;
        while (this.lineText.length > iterChar) {
            const nextChar = this.lineText.charAt(iterChar + 1);
            if (nextChar == ' ' || nextChar == '\t') {
                let textBefore = this.lineText.slice(0, iterChar + 1);
                let textAfter = this.lineText.slice(iterChar + 2, this.lineText.length);
                console.log(textBefore + '!' + textAfter);
                this.lineText = this.lineText.slice(0, iterChar + 1) + this.lineText.slice(iterChar + 1, this.lineText.length);
            }
            else {
                break;
            }
            iterChar++;
        }
        // while (iterChar > 1) {
        //     const prevChar = this.lineText.charAt(iterChar - 1);
        //     if (prevChar == ' ' || prevChar == '\t') {
        //         this.lineText = this.lineText.slice(0, iterChar - 1) + this.lineText.slice(iterChar, this.lineText.length);
        //     }
        //     else {
        //         break;
        //     }
        //     iterChar--;
        // }
    }
}