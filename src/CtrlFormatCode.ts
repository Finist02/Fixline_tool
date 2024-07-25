import * as vscode from 'vscode';
import { CtrlTokenizer, Token } from './CtrlTokenizer';

export class CtrlCodeFormatter implements vscode.DocumentFormattingEditProvider {
    private iterTabs = 0;
    private document: vscode.TextDocument;
    private bufferChanges: vscode.TextEdit[] = [];
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] | undefined {
        this.initVars();
        this.document = document;
        let tokenizer = new CtrlTokenizer(document);
        let token = tokenizer.getNextToken();
        let prevToken = token;
        while (token && prevToken) {
            this.checkEmptySpacesEnd(token, prevToken);
            if (token.symbol == 'if' || token.symbol == 'for' || token.symbol == 'switch' || token.symbol == 'while') {
                this.addSpacesAfterForIf(token);
            }
            this.checkTabs(token, prevToken);
            if (token.symbol == '}') {
                this.iterTabs--;
            }
            else if (token.symbol == '{') {
                this.iterTabs++;
            }
            prevToken = token;
            token = tokenizer.getNextToken();
        }
        return this.bufferChanges;
    }

    private initVars() {
        this.iterTabs = 0;
        this.bufferChanges = [];
    }

    private checkEmptySpacesEnd(token: Token, prevToken: Token) {
        if (token.range.start.line > prevToken.range.start.line
            && !(token.symbol.startsWith('//') || token.symbol.startsWith('/*'))
            && token.symbol != '}') {
            let lineText = this.document.lineAt(token.range.start.line).text;
            const prevLengText = lineText.length;
            lineText = lineText.trimEnd();
            if (lineText.length != prevLengText) {
                this.bufferChanges.push(
                    vscode.TextEdit.delete(
                        new vscode.Range(
                            new vscode.Position(token.range.start.line, lineText.length),
                            new vscode.Position(token.range.start.line, prevLengText))
                    ));
            }
        }
    }
    private checkTabs(token: Token, prevToken: Token) {
        if (token.range.start.line > prevToken.range.start.line
            && !(token.symbol.startsWith('//') || token.symbol.startsWith('/*'))
            && token.symbol != '}') {
            let lineText = this.document.lineAt(token.range.start.line).text;
            if (!lineText.startsWith('\t'.repeat(this.iterTabs))) {
                this.bufferChanges.push(
                    vscode.TextEdit.replace(
                        new vscode.Range(new vscode.Position(token.range.start.line, 0), new vscode.Position(token.range.start.line, token.range.start.character))
                        , '\t'.repeat(this.iterTabs)
                    ));
            }
        }
    }
    private addSpacesAfterForIf(token: Token) {
        let char = this.document.lineAt(token.range.start.line).text.charAt(token.range.end.character);
        if (char != ' ') {
            console.log(char);
            this.bufferChanges.push(
                vscode.TextEdit.insert(new vscode.Position(token.range.end.line, token.range.end.character), ' '));
        }
    }
}