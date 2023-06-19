// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';
import { panelPreviewProvider } from './panelPreviewProvider';
import { CtrlCompletionItemProvider, CtrlCompletionItemProviderStatic, providerFiles, providerUses} from './ctrlProvideCompletionItems';
import { CtrlGoDefinitionProvider } from './CtrlGoDefinitionProvider';
import * as cmdCtrl from './ctrlComands';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenProjectPanel', cmdCtrl.showQuickPick));
	context.subscriptions.push(vscode.commands.registerCommand('extension.RunScript', cmdCtrl.RunScript));
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenPanel', cmdCtrl.OpenPanel));
	context.subscriptions.push(vscode.commands.registerCommand('extension.CheckScript', cmdCtrl.CheckScript));
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenLogs', cmdCtrl.OpenLog));
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('ctl', panelPreviewProvider));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({language: "ctrlpp"}, new CtrlDocumentSymbolProvider()));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({language: "ctrlpp"}, new CtrlGoDefinitionProvider()));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider("ctrlpp", new CtrlCompletionItemProvider(), '.'));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider("ctrlpp", new CtrlCompletionItemProviderStatic(), ':', ':'));
	


	context.subscriptions.push(vscode.commands.registerCommand('extension.Panelpreview', async () => {
		let fileName = vscode.window.activeTextEditor?.document.fileName;
		if(fileName == undefined || fileName == '') return;
		let uri = vscode.Uri.parse('ctl:' + fileName + Date.now().toString() +'.ctl');
		const doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
		await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
	}))
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.OpenHelpCtrl', () => {
			const editor = vscode.window.activeTextEditor;
			if(editor && editor.document.fileName.endsWith('.ctl')) {
				let selection = editor.selection;
				let pos =  new vscode.Position(selection.start.line, selection.start.character);
				let range = editor.document.getWordRangeAtPosition(pos);
				let word = editor.document.getText(range);
				vscode.env.openExternal(vscode.Uri.parse('https://www.winccoa.com/documentation/WinCCOA/3.18/en_US/search.html?searchQuery=' + word));

			}
		}
	  )
	);
	context.subscriptions.push(providerUses, providerFiles);
}
class CtrlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	public provideDocumentSymbols(document: vscode.TextDocument,
		token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
	return new Promise((resolve, reject) => {
		let symbols = new CtrlSymbolsCreator(document);
		resolve(symbols.GetSymbols());
	});}
}
// this method is called when your extension is deactivated
export function deactivate() {}
