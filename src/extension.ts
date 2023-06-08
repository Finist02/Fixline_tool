// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';
import { QuickPickItem } from 'vscode';
import { QuickPickItemKind} from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable1 = vscode.commands.registerCommand('extension.OpenPanel', OpenPanel);
	let disposable2 = vscode.commands.registerCommand('extension.CheckScript', CheckScript);
	let disposable3 = vscode.commands.registerCommand('extension.OpenLogs', OpenLog);
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenProjectPanel', showQuickPick));
	context.subscriptions.push(vscode.commands.registerCommand('extension.RunScript', RunScript));
	context.subscriptions.push(disposable1);
	context.subscriptions.push(disposable2);
	context.subscriptions.push(disposable3);
	const myScheme = 'ctl';
	const myProvider = new class implements vscode.TextDocumentContentProvider {
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		provideTextDocumentContent(uri: vscode.Uri): string {
			let text = vscode.window.activeTextEditor?.document.getText();
			if(text == undefined) return '';
			//spec symbols
			text = text.replace(/&quot;/g, '\"');
			text = text.replace(/&lt;/g, '<');
			text = text.replace(/&gt;/g, '>');
			text = text.replace(/&amp;/g, '&');
			text = text.replace(/&apos;/g, '\'');
			//all props
			text = text.replace(/<[\/]?prop(.*)\n/g, '');
			//cdata
			text = text.replace(/<!\[CDATA\[/g, '\n');
			text = text.replace(/]]><\/script>/g, '');
			//other ***<
			text = text.replace(/<\/.*>\n/g, '');
			text = text.replace(/\s*<extended>.*/g, '');
			text = text.replace(/\s*<sizePolicy.*/g, '');
			text = text.replace(/\s*<events>/g, '');
			text = text.replace(/\s*<shapes>/g, '');
			text = text.replace(/\s*<layout/g, '');
			text = text.replace(/\s*<groups.*/g, '');
			// text = text.replace(/\n[\s\t]+(<.*)/g, '\n// ! -----$1');

			//
			text = text.replace(/\s*<shape Name="(.*)"\sshapeType.*/g, '\n//******************************************************//\n//**[$1]****************************************//');
			text = text.replace(/\s*<script name="(.*)"\sisEscaped.*/g, '\n//**[$1]****************************************//');
			
			return text;
		}
	};
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

	context.subscriptions.push(vscode.commands.registerCommand('extension.Panelpreview', async () => {
		let fileName = vscode.window.activeTextEditor?.document.fileName;
		if(fileName == undefined || fileName == '') return;
		let uri = vscode.Uri.parse('ctl:' + fileName + Date.now().toString() +'.ctl');
		const doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
		await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
	}))
}
function OpenPanel(uri: vscode.Uri) {
	let path = uri?.fsPath;
	if(path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
	OpenPanelWithPath(path);
	

}
function OpenPanelWithPath(path: string | undefined) {
	if(path == undefined || path == '') return;
	if(path.indexOf('\\panels\\') !== -1) {
		path = path.slice(path.indexOf("panels") + 7);
		let user = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("UserName");
		let pass = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("Password");
		let command = getPathInConfigFile('pvss_path') +'/bin/WCCOAui.exe -p ' + path + ' -user ' + user + ':' + pass + ' -proj ' + getPathInConfigFile('proj_name');
		const output = execShell(command);
	}
}

function RunScript(uri: vscode.Uri) {
	let path = uri?.fsPath;
	if(path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
	if(path == undefined || path == '') return;
	let command;
	if (path.indexOf('\\scripts\\') !== -1) {
		path = path.slice(path.indexOf("scripts") + 8);
		command = getPathInConfigFile('pvss_path') + '/bin/WCCOActrl.exe -proj ' + getPathInConfigFile('proj_name') + ' ' + path;
		const output = execShell(command);
	}
}
/**
 * @param uri uri акттвной влкадки
 * @returns 
 */
function CheckScript(uri: vscode.Uri) {
	let path = uri?.fsPath;
	if(path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
	if(path == undefined || path == '') return;
	let command, syntax = '';
	if (path.indexOf('\\scripts\\') !== -1) {
		let pathTestScript = path.replace(/scripts/g, 'scripts\\tests');
		let relPathScript = '';
		if (fs.existsSync(pathTestScript)) {
			relPathScript = pathTestScript.replace(/.*scripts\\/g, '');
		}
		else{
			relPathScript = path.replace(/.*scripts\\/g, '');
			syntax = '-syntax';
		}
		console.log(relPathScript);
		command = getPathInConfigFile('pvss_path') + '/bin/WCCOActrl.exe ' + syntax + ' -proj ' + getPathInConfigFile('proj_name') + ' ' + relPathScript;
		const output = execShell(command);
	}
}
const execShell = (cmd: string) =>
	new Promise<string>((resolve, reject) => {
	  cp.exec(cmd, (err, out) => {
		if (err) {
		  return resolve('error!');
		  //or,  reject(err);
		}
		return resolve(out.toString());
	  });
	});

let doLogs = true;
async function OpenLog() {
	let path = getPathInConfigFile('proj_path') + '/log/';
	if(path == '/log/' || !fs.existsSync(path)) {
		vscode.window.showErrorMessage('Не найден файл конфигурации');
		return;
	} 
	let winccLog_channel = vscode.window.createOutputChannel("WinccLogs");
	winccLog_channel.show(true);
	let fileNames = getFileNames(path);
	interface MyType {
		[key: string]: number;
	}
	let fileSizes: MyType = {};
	fileNames.forEach(element => {
		fileSizes[element] = fs.statSync(path + element).size;
	})
	while(doLogs) {
		fileNames.forEach(element => {
			let newSizeFile = fs.statSync(path + element).size;
			if(newSizeFile > fileSizes[element])
			{
				let buffer = Buffer.alloc(newSizeFile - fileSizes[element]);
				fs.open(path + element, 'r+', function (err, fd) {
					if (err) {
						return console.error(err);
					}
					fs.read(fd, buffer, 0, buffer.length,
						fileSizes[element], function (err, bytes) {
							if (err) {
								console.log(err);
							}
							if (bytes > 0) {
								let logs = buffer.slice(0, bytes).toString();
								if(element == 'PVSS_II.log')
								{
									let lines = logs.split('\n');
									lines.forEach( (item, index) => {
										if(!item.match(/.*,  INFO.*/i) && item != "")
										{
											winccLog_channel.append(item + "\n");
										}
									});
								}
								else
								{
									winccLog_channel.append(logs);
								}								
							}
							fs.close(fd, function (err) {
								if (err) {
									console.log(err);
								}
							});
						});
					fileSizes[element] = newSizeFile;
				});
			}
		})
		await delay(1000);
	}
}

function getFileNames(path: string) : string[]{
	let fileNames = fs.readdirSync(path).filter(element => {
		return element.indexOf('.log') > 0;
	})
	return fileNames;
}
function delay(ms: number) {
	return new Promise( resolve => setTimeout(resolve, ms) );
}
function getPathInConfigFile(what: string): string {
	let path = '';
	let regexp: RegExp;
	if(what == 'proj_path') {
		regexp = /^proj_path = \"(.*)\"/;
	}
	else if(what == 'pvss_path') {
		regexp = /^pvss_path = \"(.*)\"/;
	}
	else if(what == 'proj_name') {
		regexp = /^proj_path = .*[\/ | \\](.*)"/;
	}
	else return '';
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if(workspaceFolders != undefined)
	{
		let fsPath = workspaceFolders[0].uri.fsPath;
		console.log(fsPath);
		if (fs.existsSync(fsPath + '/config/config')) {
			let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
			let linesData = fileData.split('\n');
			linesData.forEach(line =>{
				const matches = line.match(regexp) || [];
				if(matches.length > 0)
				{
					path = matches[1];
				}
			});
		}
	}
	return path;
}

let prevSelectedItems: QuickPickItem[] = [{
	label: 'recently opened',
	kind: QuickPickItemKind.Separator
},
{
	label: 'all panels',
	kind: QuickPickItemKind.Separator
}
];
function onlyUnique(value: QuickPickItem, index: number, array: QuickPickItem[]) {
	return array.indexOf(value) === index;
}
export async function showQuickPick() {
	const result = await vscode.window.showQuickPick(GetPathsFiles());
	if(result != undefined) {
		prevSelectedItems.splice(1, 0, result);
		let path = result.description;
		OpenPanelWithPath(path);
	}
}
async function GetPathsFiles() {
	prevSelectedItems = prevSelectedItems.filter(onlyUnique);
	const files = await vscode.workspace.findFiles('**/panels/**/*.xml');
	const items: QuickPickItem[] = [];
	prevSelectedItems.forEach(item =>{
		items.push(item);
	});
	files.forEach(file => {
		let path = file.fsPath;
		let splittedPath  = path.split('panels\\');
		items.push({
			label: '$(notebook-open-as-text) ' + splittedPath[splittedPath.length-1],
			description: path
		});
	})
	return items;
}


// this method is called when your extension is deactivated
export function deactivate() {}
