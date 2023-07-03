import * as vscode from 'vscode';
import { CtrlHoverProvider } from './CtrlHoverProvider';
export class CtrlSignatureHelpProvider implements vscode.SignatureHelpProvider {
    public async provideSignatureHelp(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Promise<vscode.SignatureHelp> {
			let signature = new vscode.SignatureHelp;
			const hoverProvider = new CtrlHoverProvider();
			let line = document.lineAt(position.line).text;
			const posVar = new vscode.Position(position.line, line.lastIndexOf('('));
			const countInputVars = line.slice(posVar.character, line.length).split(',');
			return hoverProvider.GetSignatureHover(document, posVar, token).then((comment) => {
				if(comment) {
					const countVarsInFuns = comment[1].slice(comment[1].indexOf('(')+1, comment[1].length-1).split(',');
					let signatureInformation = new vscode.SignatureInformation(comment[1], comment[0].replace(/\t+/g, ' '));
					signatureInformation.parameters = [new vscode.ParameterInformation(countVarsInFuns[countInputVars.length-1])];
					signature.signatures = [signatureInformation];
				}
				return signature;
			})	
    }
}