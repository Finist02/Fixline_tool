import * as vscode from 'vscode';

export class TextSplitter {
    private lines: string[];
    public lineCount: number;
    readonly text: string;
    private splitterLine = '\n';
    constructor(text: string) {
        if (text.indexOf('\r\n') >= 0) {
            this.splitterLine = '\r\n';
        }
        this.text = text;
        this.lines = this.text.split(this.splitterLine);
        this.lineCount = this.lines.length;
    }
    public lineAt(num: number) {
        return this.lines[num];
    }
    public getText(range: vscode.Range) {
        let text = '';
        if (range.start.line == range.end.line) {
            text = this.lines[range.start.line].slice(range.start.character, range.end.character);
            return text;
        }
        for (let i = range.start.line; i <= range.end.line; i++) {
            if (i == range.start.line) {
                text += this.lines[i].slice(range.start.character, this.lines[i].length) + this.splitterLine;
            }
            else if (i == range.end.line) {
                text += this.lines[i].slice(0, range.end.character)
            }
            else {
                text += this.lines[i] + this.splitterLine;
            }
        }
        return text;
    }
    public getTextWithoutComment(range: vscode.Range) {
        let text = this.getText(range);
        let commentRegExp = /\/\*.*?\*\//gs.exec(text);
        while (commentRegExp) {
            const countNewLines = commentRegExp[0].split('\n');
            if (countNewLines.length > 1) {
                text = text.replace(commentRegExp[0], '\n'.repeat(countNewLines.length - 1));
            }
            else {
                text = text.replace(commentRegExp[0], ' '.repeat(commentRegExp[0].length - 1));
            }
            commentRegExp = /\/\*.*?\*\//gs.exec(text);
        }
        let lineCommentRegExp = /\/\/.*?\n/gs.exec(text);
        while (lineCommentRegExp) {
            text = text.replace(lineCommentRegExp[0], '\n');
            lineCommentRegExp = /\/\/.*?\n/gs.exec(text);
        }
        return text;
    }
}

export class TokensInLine {
    readonly line: number = 0;
    readonly tokens: Token[] = [];
    constructor(line: number, tokens: Token[]) {
        this.line = line;
        this.tokens = tokens;
    }
}

export class Token {
    readonly range: vscode.Range;
    readonly symbol: string = '';
    constructor(range: vscode.Range, symbol: string) {
        this.range = range;
        this.symbol = symbol;
    }
}

export class CtrlTokenizer {
    private currIdxToken = -1;
    private token: Token[] = [];
    private allTokens: Token[] = [];
    readonly textSplitter: TextSplitter;
    readonly commentTokens: Token[] = [];
    constructor(document: vscode.TextDocument | string) {
        if (typeof document === 'string') {
            this.textSplitter = new TextSplitter(document);
        }
        else {
            this.textSplitter = new TextSplitter(document.getText());
        }
        this.createTokens();
    }
    public getNextToken(step: number = 1) {
        this.currIdxToken = this.currIdxToken + step;
        if (this.currIdxToken < this.allTokens.length) {
            return this.allTokens[this.currIdxToken];
        }
        return null;
    }

    public getPrevToken(steps: number = 1) {
        if (this.currIdxToken - steps >= 0) {
            return this.allTokens[this.currIdxToken - steps];
        }
        return null;
    }

    public backToken(steps: number = 1) {
        this.currIdxToken = this.currIdxToken - steps;
    }

    public resetIndexTokens() {
        this.currIdxToken = -1;
    }

    public getTokens(range: vscode.Range) {
        let tokens = [];
        for (let i = 0; i < this.allTokens.length; i++) {
            if (this.allTokens[i].range.start.line >= range.start.line
                && this.allTokens[i].range.end.line <= range.end.line) {
                tokens.push(this.allTokens[i]);
            }
        }
        return tokens;
    }

    public setTokensPosition(position: vscode.Position) {
        for (let i = 0; i < this.allTokens.length; i++) {
            this.currIdxToken = i;
            if (this.allTokens[i].range.start.line >= position.line) {
                return;
            }
        }
    }



    private createTokens() {
        let bufferToken = '';
        let isCommentString = false;
        let isCommentMulti = false;
        let j = 0;
        for (let i = 0; i < this.textSplitter.lineCount; i++) {
            const line = this.textSplitter.lineAt(i);
            if (isCommentMulti) {
                isCommentMulti = false;
            }
            else {
                j = 0;
            }
            for (j; j < line.length; j++) {
                if (isCommentString) {
                    isCommentString = false;
                    break;
                }
                let char = line.charAt(j);
                switch (char) {
                    case '/':
                        if (j < line.length - 1) {
                            let nextChar = line.charAt(j + 1);
                            if (nextChar == '*') {
                                let rangeComment = this.findEndComment(i, j);
                                bufferToken = this.textSplitter.getText(rangeComment);
                                j = rangeComment.end.character;
                                this.token.push(new Token(rangeComment, bufferToken));
                                this.commentTokens.push(new Token(rangeComment, bufferToken));
                                bufferToken = '';
                                if (i != rangeComment.end.line) {
                                    isCommentMulti = true;
                                    i = rangeComment.end.line - 1;
                                    break;
                                }
                                continue;
                            }
                            if (nextChar == '/') {
                                bufferToken = this.textSplitter.getText(this.craeteRange(i, j, line.length));
                                this.token.push(new Token(this.craeteRange(i, j, line.length), bufferToken));
                                this.commentTokens.push(new Token(this.craeteRange(i, j, line.length), bufferToken));
                                bufferToken = '';
                                isCommentString = true;
                                continue;
                            }
                            else {
                                if (bufferToken != '') {
                                    this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                                }
                                this.token.push(new Token(this.craeteRange(i, j - 1, j), char));
                                bufferToken = '';
                            }
                        }
                        break;
                    case '"':
                        let rangeComment = this.findEndStringLiteral(i, j);
                        try {
                            bufferToken = this.textSplitter.getText(rangeComment);

                        } catch (error) {
                            console.log('getText ' + rangeComment);
                        }
                        i = rangeComment.end.line;
                        j = rangeComment.end.character - 1;
                        this.token.push(new Token(rangeComment, bufferToken));
                        bufferToken = '';
                        continue;
                    case '-':
                    case '+':
                    case '=':
                    case '<':
                    case '>':
                    case '*':
                    case '/':
                    case '%':
                    case '!':
                    case '&':
                    case '|':
                    case ':':
                        if (bufferToken != '' && (char == '<' || char == '>')) {
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                            this.token.push(new Token(this.craeteRange(i, j - 1, j), char));
                            bufferToken = '';
                        }
                        else if (j < line.length - 1 && line.charAt(j + 1).match(/\-|\+|\=|\<|\>|\*|\/|\%|\!|\&|\:|\|/)) {
                            if (bufferToken != '') {
                                this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                            }
                            bufferToken = char + line.charAt(j + 1);
                            j++;
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length + 1, j + 1), bufferToken));
                            bufferToken = '';
                        }
                        else {
                            if (bufferToken != '') {
                                this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                            }
                            this.token.push(new Token(this.craeteRange(i, j - 1, j), char));
                            bufferToken = '';
                        }
                        continue;
                    case '}':
                    case '{':
                    case ';':
                    case ',':
                    case ')':
                    case '(':
                    case ']':
                    case '[':
                    case '.':
                        if (bufferToken != '') {
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                        }
                        this.token.push(new Token(this.craeteRange(i, j, j + 1), char));
                        bufferToken = '';
                        continue;
                    case ' ':
                    case '\t':
                        if (bufferToken != '') {
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                        }
                        bufferToken = '';
                        continue;
                    default:
                        break;
                }
                if (isCommentMulti) {
                    break;
                }
                bufferToken += char;
                if (bufferToken != '' && j == line.length - 1) {
                    this.token.push(new Token(this.craeteRange(i, j - bufferToken.length + 1, j + 1), bufferToken));
                    bufferToken = '';
                }
            }
            this.allTokens = this.allTokens.concat(this.token);
            this.token = [];
        }
    }

    private craeteRange(lineNumber: number, start: number, end: number) {
        const range = new vscode.Range(new vscode.Position(lineNumber, start), new vscode.Position(lineNumber, end));
        return range;
    }

    private findEndComment(lineNumber: number, position: number) {
        let i = lineNumber, j = position;
        for (i; i < this.textSplitter.lineCount; i++) {
            const line = this.textSplitter.lineAt(i);
            if (i != lineNumber) {
                j = 0;
            }
            for (j; j < line.length - 1; j++) {
                let findToken = line.charAt(j) + line.charAt(j + 1);
                if (findToken == '*/') {
                    return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j + 2));
                }
            }
        }
        return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j));
    }

    private findEndStringLiteral(lineNumber: number, position: number) {
        let i = lineNumber, j = position + 1;
        for (i; i < this.textSplitter.lineCount; i++) {
            const line = this.textSplitter.lineAt(i);
            if (i != lineNumber) {
                j = 0;
            }
            for (j; j < line.length; j++) {
                let findToken = line.charAt(j);
                if (findToken == '"') {
                    if (line.length > j && line.charAt(j - 1) == '\\') {
                        if (line.length > j - 1 && line.charAt(j - 2) == '\\') {
                            return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j + 1));
                        }
                        else {
                            continue;
                        }
                    }
                    return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j + 1));
                }
            }
        }
        return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j));
    }
}

