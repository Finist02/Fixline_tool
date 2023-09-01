// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CtrlDocumentSymbolProvider, CtrlSymbolsCreator } from './ctrlSymbolsCreator';
import { panelPreviewProvider } from './panelPreviewProvider';
import { CtrlCompletionItemProvider, CtrlCompletionItemProviderStatic, providerFiles, providerUses} from './ctrlProvideCompletionItems';
import { CtrlDefinitionProvider } from './CtrlDefinitionProvider';
import * as cmdCtrl from './ctrlComands';
import { CtrlHoverProvider } from './CtrlHoverProvider';
import { CtrlSignatureHelpProvider } from './CtrlSignatureHelpProvider';
import { CtrlSemanticTokensProvider, legend } from './ctrlSemanticTokensProvider';
import { CtrlReferenceProvider } from './CtrlReferenceProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenProjectPanel', cmdCtrl.showQuickPick));
	context.subscriptions.push(vscode.commands.registerCommand('extension.RunScript', cmdCtrl.RunScript));
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenPanel', cmdCtrl.OpenPanel));
	context.subscriptions.push(vscode.commands.registerCommand('extension.CheckScript', cmdCtrl.CheckScript));
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenLogs', cmdCtrl.OpenLog));
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenUnitTest', cmdCtrl.OpenUnitTest));
	context.subscriptions.push(vscode.commands.registerCommand("extension.CreateChangelog", cmdCtrl.CreateChangelog));
	context.subscriptions.push(vscode.commands.registerCommand("extension.GetHelpChatGpt", cmdCtrl.GetHelpChatGpt));

	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('ctl', panelPreviewProvider));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({language: "ctrlpp"}, new CtrlDocumentSymbolProvider()));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({language: "ctrlpp"}, new CtrlDefinitionProvider()));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider("ctrlpp", new CtrlCompletionItemProvider(), '.'));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider("ctrlpp", new CtrlCompletionItemProviderStatic(), ':', ':'));
	context.subscriptions.push(vscode.languages.registerHoverProvider("ctrlpp", new CtrlHoverProvider()));
	context.subscriptions.push(vscode.languages.registerSignatureHelpProvider("ctrlpp", new CtrlSignatureHelpProvider(), '(', ','));
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider("ctrlpp", new CtrlSemanticTokensProvider(), legend));
	context.subscriptions.push(vscode.languages.registerReferenceProvider("ctrlpp", new CtrlReferenceProvider()));
	context.subscriptions.push(vscode.languages.registerRenameProvider("ctrlpp", new CtrlRenameProvider()));





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
// this method is called when your extension is deactivated
export function deactivate() {}

class CtrlRenameProvider implements vscode.RenameProvider {
    public provideRenameEdits(
        document: vscode.TextDocument, position: vscode.Position,
        newName: string, token: vscode.CancellationToken):
        Thenable<vscode.WorkspaceEdit> {
			return new Promise((resolve, reject) => {
				let referProvider = new CtrlReferenceProvider();
				referProvider.provideReferences(document, position, {includeDeclaration: false}, token).then( locations => {
					let edit = new vscode.WorkspaceEdit();
					if(locations.length > 0)
					{
						locations.forEach(location => {
							edit.replace(location.uri, location.range, newName);
						})
						resolve(edit);
					}
					else {
						reject();
					}
				}, function(reason){
					vscode.window.showErrorMessage('На данные момент не раелизовано изменение имени объекта не объявленного в самом файле');
					reject();
				})}
			);
		};
}
