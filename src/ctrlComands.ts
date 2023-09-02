import * as cp from "child_process";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { QuickPickItem } from 'vscode';
import { QuickPickItemKind} from 'vscode';
import axios from 'axios';
import * as path from 'path';
import hljs from 'highlight.js';
hljs.registerLanguage('xml', require('highlight.js/lib/languages/xml'));


export function OpenPanel(uri: vscode.Uri) {
	let path = uri?.fsPath;
	if(path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
	OpenPanelWithPath(path);
}

export async function GetHelpChatGpt()
{
	const editor = vscode.window.activeTextEditor;
	let word = 'dpGet';
	if(editor && editor.document.fileName.endsWith('.ctl')) {
		let selection = editor.selection;
		let pos =  new vscode.Position(selection.start.line, selection.start.character);
		let range = editor.document.getWordRangeAtPosition(pos);
		word = editor.document.getText(range);
	}
	const question = await vscode.window.showInputBox({
		placeHolder: 'Введите вопрос',
		prompt: 'Введите вопрос',
		value: 'Get examples of function '+word
	});
	const panel = vscode.window.createWebviewPanel(
		'catCoding', // Identifies the type of the webview. Used internally
		'answerChatGPT', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{} // Webview options. More on these later.
	);
	axios({
		timeout: 3000,
		method: 'post',
        url: 'https://www.chatbase.co/api/fe/chat',
        headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Allow-Origin': "*",
          "mode": 'cors'
        }, 
        data: {
          "chatId": "FSC9Kt9Dyz9kfmgiwBX0q",
          "captchaCode": "hadsa",
          "messages": [
			  {
				  "content": question,
				  "role": "user"
          }
        ]
	}}).then(answer => {
		const panel = vscode.window.createWebviewPanel(
			'answerChatGPT', // Identifies the type of the webview. Used internally
			'answerChatGPT', // Title of the panel displayed to the user
			vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
			{} // Webview options. More on these later.
		);
		let data = answer.data;
		const regexp =/(.*?)(```)(.*?)(```\n)/gs;
		let regexpResult = regexp.exec(data);
		let dataInView = '';
		if(regexpResult) {
			while(regexpResult) {
				dataInView = dataInView + regexpResult[1].replace(/\n/gs, '<br>');
				dataInView = dataInView + '<pre><code>'+hljs.highlight(regexpResult[3], { language: 'cpp' }).value+'</code></pre>';
				regexpResult = regexp.exec(data);
				regexpResult?.index
			}
			let regExLastText = /(```\n)(?!.*```)(.*)$/gs.exec(data);
			if(regExLastText)
			{
				dataInView = dataInView + regExLastText[2].replace(/\n/gs, '<br>');
			}

		}
		else {
			dataInView = answer.data.replace(/\n/gs, '<br>');
		}
		panel.webview.html = `<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="UTF-8">
		<link rel="stylesheet" href="https://unpkg.com/@highlightjs/cdn-assets@11.3.1/styles/github-dark.min.css" />
		<script src="https://unpkg.com/@highlightjs/cdn-assets@11.3.1/highlight.min.js"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js"></script>
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Cat Coding</title>
		</head>
		<body>
		<div >`+dataInView+`</div>
		<div ><br></div>
		<div ><br></div>
		<div ><br></div>
		<div >`+data+`</div>
		</body>
		</html>`;
	});
}
export async function CreateChangelog() {
	const GITLAB_TOKEN = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("GitlabToken");
	const GITLAB_URL = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("GitlabUrl");
	if( typeof(GITLAB_TOKEN) !== 'string' ||  typeof(GITLAB_URL) !== 'string') {
		return;
	}
	let projectsFolders = GetProjectsInConfigFile(false);
	let items: QuickPickItem[] = [];
	projectsFolders.forEach(path => {
		let splittedPath  = path.split('/');
		items.push({
			label: splittedPath[splittedPath.length-1],
			description: path
		});
	})
	const pathCreateChangelog = await vscode.window.showQuickPick(items);
	const versionRelease = await vscode.window.showInputBox({
		placeHolder: 'Укажите версию релиза',
		prompt: 'Укажите версию релиза',
		value: '0.1.1'
	});
	if(pathCreateChangelog) {
		let changelogData = '';
		const gitBracnhes  = await execShell('cd /D'+pathCreateChangelog.description+' && git branch');
		const currentBranch = GetBranchToCreateChangelog(gitBracnhes);
		const lastCommit  = await execShell('cd /D'+pathCreateChangelog.description+' && git log --pretty=format:"%h" -1');
		let firstCommit  = await execShell('cd /D'+pathCreateChangelog.description+' && git log --max-parents=0 HEAD --pretty=format:"%h"');
		const pathChangelog = pathCreateChangelog.description + '/CHANGELOG.md';
		let uriToFChangelog = vscode.Uri.parse("file:" + pathChangelog);
		axios.get(GITLAB_URL+'/api/v4/projects?search='+pathCreateChangelog.label, {
			headers: {
				'PRIVATE-TOKEN': GITLAB_TOKEN
			}
		}).then(response  => {
			const projectsProp = response.data;
			if(projectsProp[0]['name'] ==  pathCreateChangelog.label) {
				const idProject = projectsProp[0]['id'];
				if (fs.existsSync(pathChangelog)) {
					changelogData = fs.readFileSync(pathChangelog, 'utf8');
					let resultReg = /(?<=@)[\da-f]{8}/.exec(changelogData);
					if(resultReg)
					{
						firstCommit = resultReg[0];
					}
				}
				axios.get(GITLAB_URL+'/api/v4/projects/'+idProject+'/repository/changelog?'
					+'version='+versionRelease
					+'&from='+firstCommit
					+'&to='+lastCommit
					+'&branch='+currentBranch,
					{
						headers: {
							'PRIVATE-TOKEN': GITLAB_TOKEN
					}
				}).then(response => {
					const writeBytes = Buffer.from(response.data['notes'] + '\n' + changelogData);
					vscode.workspace.fs.writeFile(uriToFChangelog, writeBytes).then(() => {
						OpenFileVscode(uriToFChangelog);
					});	
				}
				).catch(err => {
					console.log(err);
				})
			}
		})		
	}
}

function GetBranchToCreateChangelog(gitBracnhes: string) {
	let regexpResult = /\*\s(\w*)/.exec(gitBracnhes);
	if(regexpResult && regexpResult[1]) {
		return regexpResult[1];
	}
	return '';
}
export function OpenUnitTest() {
	let fsPath = vscode.window.activeTextEditor?.document.uri.fsPath;
	if(fsPath == undefined) return;
	let pathTestScript = fsPath.replace('scripts\\libs\\', 'scripts\\tests\\libs\\');
	let uriToFileTests = vscode.Uri.parse("file:" + pathTestScript);
	if (!fs.existsSync(pathTestScript)) {
		let pathPvss = GetPvssPath() + '/data/hsp/templates/scriptEditor/newUnitTest.ctl';
		if (fs.existsSync(pathPvss)) {
			let fileData = fs.readFileSync(pathPvss, 'utf8');
			let splittedPath = fsPath.split('\\');
			let origLibName = splittedPath[splittedPath.length-1].slice(0, -4);
			let resultReg = /scripts\\libs\\(.*)/.exec(fsPath);
			if(resultReg && resultReg[1])
			{
				let origLibRelPathWithoutExtension = resultReg[1].replace(/\\/g, '/');
				fileData = fileData.replace('$origLibRelPathWithoutExtension', origLibRelPathWithoutExtension);
				fileData = fileData.replace(/\$origLibName/g, origLibName);
				fileData = fileData.replace(/newTestTemplate/g, 'Test_' + origLibName.replace(/-/g, ''));

			}
			const writeBytes = Buffer.from(fileData);
			vscode.workspace.fs.writeFile(uriToFileTests, writeBytes).then(() => {
				OpenFileVscode(uriToFileTests);
			});
		}
		
	}
	else {
		OpenFileVscode(uriToFileTests);
	}
	
}

export function OpenPanelWithPath(path: string | undefined) {
	if(path == undefined || path == '') return;
	if(path.indexOf('\\panels\\') !== -1) {
		path = path.slice(path.indexOf("panels") + 7);
		let user = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("UserName");
		let pass = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("Password");
		let command = getPathInConfigFile('pvss_path') +'/bin/WCCOAui.exe -p ' + path + ' -user ' + user + ':' + pass + ' -proj ' + getPathInConfigFile('proj_name');
		const output = execShell(command);
	}
}

export function RunScript(uri: vscode.Uri) {
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
export function CheckScript(uri: vscode.Uri) {
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
		command = getPathInConfigFile('pvss_path') + '/bin/WCCOActrl.exe ' + syntax + ' -proj ' + getPathInConfigFile('proj_name') + ' ' + relPathScript;
		const output = execShell(command);
	}
}
const execShell = (cmd: string) =>
	new Promise<string>((resolve, reject) => {
	  cp.exec(cmd, (err, out) => {
		if (err) {
		  return resolve(err.message);
		  //or,  reject(err);
		}
		return resolve(out.toString());
	  });
	});

let doLogs = true;
export async function OpenLog() {
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

export const ThroughFiles = (directory: string) => {
	let files: string[] = fs.readdirSync(directory);
	let innerFiles: string[] = new Array();
	files.forEach(file => {
		const pathFile = path.join(directory, file);
		if (fs.statSync(pathFile).isDirectory() && file != '.git') {
			innerFiles = innerFiles.concat(ThroughFiles(pathFile));
		}
		else {
			innerFiles.push(pathFile);
		}
	});
	return innerFiles;
}

export function  GetProjectsInConfigFile(withPvss = true): string[] {
	let paths = [];
	let regexp =/proj_path = \"(.*?)\"/g;
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if(workspaceFolders)
	{
		let fsPath = workspaceFolders[0].uri.fsPath;
		if (fs.existsSync(fsPath + '/config/config')) {
			let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
			let result;
			while (result = regexp.exec(fileData)) {
				if(result[1]) {
					paths.push(result[1]);
				}
			}
			if(withPvss) {
				result = /pvss_path = \"(.*?)\"/g.exec(fileData);
				if(result) {
					paths.push(result[1]);
				}
			}
		}
	}
	paths = paths.reverse();
	return paths;
}


export function  GetPvssPath(): string {
	let paths: string = '';
	let regexp =/pvss_path = \"(.*?)\"/g;
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if(workspaceFolders)
	{
		let fsPath = workspaceFolders[0].uri.fsPath;
		if (fs.existsSync(fsPath + '/config/config')) {
			let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
			let result = regexp.exec(fileData);
			if(result != undefined && result[1]) {
				paths = result[1];
			}
		}
	}
	return paths;
}
const OpenFileVscode = (setting: vscode.Uri) => {
	vscode.workspace.openTextDocument(setting).then((a: vscode.TextDocument) => {
		vscode.window.showTextDocument(a, 1, false)
	})
}
