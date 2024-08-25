import * as cp from "child_process";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { QuickPickItem } from 'vscode';
import { QuickPickItemKind } from 'vscode';
import axios from 'axios';
import * as path from 'path';
import hljs from 'highlight.js';
import os = require('os');
import AuthSettings from "./CtrlSecretStorage";
const md = require('markdown-it')({
	highlight: function (str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch (__) { }
		}
		return ''; // use external default escaping
	}
});

let winccLog_channel: vscode.OutputChannel;

export function OpenPanel(uri: vscode.Uri) {
	let path = uri?.fsPath;
	if (path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
	OpenPanelWithPath(path);
}
export async function GetHelpChatGpt() {
	const editor = vscode.window.activeTextEditor;
	let word = 'dpGet';
	if (editor && editor.document.fileName.endsWith('.ctl')) {
		let selection = editor.selection;
		let pos = new vscode.Position(selection.start.line, selection.start.character);
		let range = editor.document.getWordRangeAtPosition(pos);
		word = editor.document.getText(range);
	}
	const question = await vscode.window.showInputBox({
		placeHolder: 'Введите вопрос',
		prompt: 'Введите вопрос',
		value: 'Get examples of function ' + word
	});
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
		}
	}).then(answer => {
		const panel = vscode.window.createWebviewPanel(
			'answerChatGPT', // Identifies the type of the webview. Used internally
			'answerChatGPT', // Title of the panel displayed to the user
			vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
			{} // Webview options. More on these later.
		);
		let result = md.render(answer.data);
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
			<div >`+ result + `</div>
			</body>
			</html>`;
	});
}

export async function StartUnitTests() {
	let projectsFolders = GetProjectsInConfigFile(false);
	let items: QuickPickItem[] = [];
	projectsFolders.forEach(path => {
		let splittedPath = path.split('/');
		items.push({
			label: splittedPath[splittedPath.length - 1],
			description: path
		});
	})
	const pathStartTests = await vscode.window.showQuickPick(items);
	if (pathStartTests == undefined) return;
	const files = ThroughFiles(pathStartTests.description + '/scripts/tests/');
	let reportPath = getPathInConfigFile('proj_path') + '/data/oaTest/results/report.xml';
	fs.rmSync(reportPath);
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: pathStartTests.label,
		cancellable: false
	}, (progress) => {
		progress.report({ increment: 0 });
		const p = new Promise<void>(resolve => {
			const lenghtInnerFiles = 100 / files.length;
			files.forEach(pathFile => {
				const command = getPathInConfigFile('pvss_path') + '/bin/WCCOActrl.exe -proj ' + getPathInConfigFile('proj_name') + ' ' + pathFile;
				cp.execSync(command);
				progress.report({ increment: lenghtInnerFiles, message: '\n' + pathFile });
			});
			resolve();
		});
		return p;
	});
	const fileData = fs.readFileSync(reportPath, 'utf8');
	if (fileData.indexOf('<failure message=') > 0) {
		vscode.window.showErrorMessage('Тесты провалены', 'Посмотреть отчет').then(selection => {
			if (selection == 'Посмотреть отчет') {
				vscode.workspace.openTextDocument(reportPath).then((a: vscode.TextDocument) => {
					vscode.window.showTextDocument(a, 1, false)
				})
			}
		});
	}
	else {
		vscode.window.showInformationMessage('Все тесты пройдены', 'Ok');
	}
}

export async function CreateDoxyHelp() {
	let projectsFolders = GetProjectsInConfigFile(false);
	let items: QuickPickItem[] = [];
	projectsFolders.forEach(path => {
		let splittedPath = path.split('/');
		items.push({
			label: splittedPath[splittedPath.length - 1],
			description: path
		});
	})
	const pathCreateHelp = await vscode.window.showQuickPick(items, { canPickMany: true });
	if (pathCreateHelp == undefined) return;
	const extensionFixline = vscode.extensions.getExtension('Danil.fixline-tool');
	if (extensionFixline == undefined) return;
	const pathResourseFolder = extensionFixline.extensionPath;
	let doxygen_convertCtlPath = getPathInConfigFile('proj_path') + '/scripts/doxygen_convertCtl.ctl'
	fs.copyFileSync(pathResourseFolder + '/resources/doxygen_convertCtl.ctl', doxygen_convertCtlPath);
	pathCreateHelp.forEach(pickedItem => {
		CreateHelpInSubProjectWithPb(pickedItem, pathResourseFolder);
	});
	if (fs.existsSync(doxygen_convertCtlPath)) {
		fs.unlinkSync(doxygen_convertCtlPath);
	}
}

function CreateHelpInSubProjectWithPb(pickedItem: vscode.QuickPickItem, pathResourseFolder: string) {
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: pickedItem.label,
		cancellable: false
	}, (progress) => {
		progress.report({ increment: 0 });
		const p = new Promise<void>(resolve => {
			const pathSubProj = pickedItem.description;
			if (pathSubProj == undefined) return;
			const pathFolderHelp = pathSubProj + '/data/help/' + pickedItem.label + '/';
			if (fs.existsSync(pathSubProj + '/data/help')) {
				fs.rmSync(pathSubProj + '/data/help', { recursive: true });
			}
			fs.mkdirSync(pathSubProj + '/data/help', { recursive: true, });
			let configDoxy = fs.readFileSync(pathResourseFolder + '/resources/doxygenConfig.txt', 'utf8');
			configDoxy = configDoxy.replace(/\${PROJECT_NAME}/gm, pickedItem.label);
			configDoxy = configDoxy.replace('${OUTPUT_DIRECTORY}', pathFolderHelp);
			configDoxy = configDoxy.replace('${IMAGE_PATH}', pathSubProj + '/pictures/');
			configDoxy = configDoxy.replace('${IMAGE_PATH_DOC}', pathSubProj + '/doc/');
			const dirSourcesFolder = CopyFolderProjForDoxyToTempFolder(pathSubProj);
			configDoxy = configDoxy.replace(/\${TEMP_PATH_SOURCE}/gm, dirSourcesFolder) + '/scripts/';
			const fd = fs.openSync(pathResourseFolder + '/resources/tempDoxygenConfig.txt', 'w+');
			const position = 0;
			fs.writeSync(fd, configDoxy, position, 'utf8');
			let innerFiles = ThroughFiles(dirSourcesFolder + '/scripts/');
			const lenghtInnerFiles = 100 / innerFiles.length;
			innerFiles.forEach(filePath => {
				const command = getPathInConfigFile('pvss_path') + '/bin/WCCOActrl.exe -proj ' + getPathInConfigFile('proj_name') + ' doxygen_convertCtl.ctl ' + filePath + ' ' + dirSourcesFolder + '/scripts/';
				cp.execSync(command);
				progress.report({ increment: lenghtInnerFiles, message: filePath });
			})
			execShell('doxygen ' + pathResourseFolder + '/resources/tempDoxygenConfig.txt').then(response => {
				if (dirSourcesFolder) {
					fs.rmSync(dirSourcesFolder, { recursive: true });
				}
			});
			resolve();
		});
		return p;
	});
}

function CopyFolderProjForDoxyToTempFolder(sourceFoldersPath: string) {
	let tmpDir = '';
	const appPrefix = 'KASKAD_docuGenerator_';
	try {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
		try {
			fs.cpSync(sourceFoldersPath + '/scripts/', tmpDir + '/scripts/', { recursive: true, });
			if (fs.existsSync(sourceFoldersPath + '/pictures/')) {
				fs.cpSync(sourceFoldersPath + '/pictures/', tmpDir + '/pictures/', { recursive: true, });
			}
			if (fs.existsSync(sourceFoldersPath + '/doc/')) {
				fs.cpSync(sourceFoldersPath + '/doc/', tmpDir + '/doc/', { recursive: true, });
				if (fs.existsSync(sourceFoldersPath + '/CHANGELOG.md')) {
					fs.cpSync(sourceFoldersPath + '/CHANGELOG.md', tmpDir + '/doc/CHANGELOG.md', { recursive: true, });
				}
			}
		} catch (e) {
			console.log(e);
		}
	}
	catch {
		// handle error
	}
	tmpDir = tmpDir.replace(/\\/gm, '/');
	return tmpDir;
}

export async function CreateChangelog(isNewEnterToken: boolean = false) {
	let GITLAB_TOKEN = await getGitlabToken(isNewEnterToken);
	if (GITLAB_TOKEN == '') return;
	const GITLAB_URL = vscode.workspace.getConfiguration("FixLineTool.Gitlab").get("GitlabUrl");
	if (typeof (GITLAB_TOKEN) !== 'string' || typeof (GITLAB_URL) !== 'string') {
		return;
	}
	let projectsFolders = GetProjectsInConfigFile(false);
	let items: QuickPickItem[] = [];
	items.push({
		label: 'all',
		description: 'all sub projects'
	});
	projectsFolders.forEach(path => {
		let splittedPath = path.split('/');
		items.push({
			label: splittedPath[splittedPath.length - 1],
			description: path
		});
	})
	const pathCreateChangelog = await vscode.window.showQuickPick(items);
	if (pathCreateChangelog == undefined) return;
	const versionRelease = await vscode.window.showQuickPick([
		{ label: 'maintenance', description: 'maintenance' }
		, { label: 'minor', description: 'minor' }
		, { label: 'major', description: 'major' }
	]);
	if (versionRelease == undefined) return;
	if (pathCreateChangelog.label == 'all') {
		projectsFolders.forEach(path => {
			let splittedPath = path.split('/');
			CreateChangelogSubProject({ label: splittedPath[splittedPath.length - 1], description: path }, versionRelease.label, GITLAB_TOKEN, GITLAB_URL);
		})
	}
	else {
		const err = await CreateChangelogSubProject(pathCreateChangelog, versionRelease.label, GITLAB_TOKEN, GITLAB_URL);
		if (err && err.response.status == 401) {
			CreateChangelog(true);
		}
	}
}

async function getGitlabToken(isNewEnterToken: boolean = false) {
	let GITLAB_TOKEN = '';
	const settings = AuthSettings.instance;
	const tokenOutput = await settings.getAuthData('gitlab_token');
	if (isNewEnterToken) {
		const tokenInput = await vscode.window.showInputBox({
			placeHolder: 'Введите токен',
			prompt: 'Введите токен'
		});
		if (tokenInput) {
			GITLAB_TOKEN = tokenInput;
			await settings.storeAuthData('gitlab_token', tokenInput);
		}
	}
	else {
		if (tokenOutput) {
			GITLAB_TOKEN = tokenOutput;
		}
		else {
			const tokenInput = await vscode.window.showInputBox({
				placeHolder: 'Введите токен',
				prompt: 'Введите токен'
			});
			if (tokenInput) {
				GITLAB_TOKEN = tokenInput;
				await settings.storeAuthData('gitlab_token', tokenInput);
			}
		}
	}

	return GITLAB_TOKEN;
}
async function CreateChangelogSubProject(pathCreateChangelog: vscode.QuickPickItem, typeUpdate: string, GITLAB_TOKEN: string, GITLAB_URL: string) {
	let changelogData = '';

	const gitBracnhes = await execShell('cd /D' + pathCreateChangelog.description + ' && git branch');
	const currentBranch = GetBranchToCreateChangelog(gitBracnhes);
	const lastCommit = await execShell('cd /D' + pathCreateChangelog.description + ' && git log --pretty=format:"%h" -1');
	let firstCommit = await execShell('cd /D' + pathCreateChangelog.description + ' && git log --max-parents=0 HEAD --pretty=format:"%h"');
	const pathChangelog = pathCreateChangelog.description + '/CHANGELOG.md';
	let uriToFChangelog = vscode.Uri.parse("file:" + pathChangelog);
	return await axios.get(GITLAB_URL + '/api/v4/projects?search=' + pathCreateChangelog.label, {
		headers: {
			'PRIVATE-TOKEN': GITLAB_TOKEN
		}
	}).then(response => {
		const projectsProp = response.data;
		if (projectsProp[0]['path'] == pathCreateChangelog.label) {
			let versionRelease = '1.0.0';
			const idProject = projectsProp[0]['id'];
			if (fs.existsSync(pathChangelog)) {
				changelogData = fs.readFileSync(pathChangelog, 'utf8');
				let funcRegExp = /## (?<major>\d*)\.(?<minor>\d*).(?<maintenance>\d*) \(\d\d\d\d-\d\d-\d\d\)/m.exec(changelogData);
				if (funcRegExp && funcRegExp.groups) {
					let major = Number(funcRegExp.groups['major']);
					let minor = Number(funcRegExp.groups['minor']);
					let maintenance = Number(funcRegExp.groups['maintenance']);
					if (typeUpdate == 'major') {
						major++;
						versionRelease = major.toString() + '.0.0';
					}
					else if (typeUpdate == 'minor') {
						minor++;
						versionRelease = major.toString() + '.' + minor.toString() + '.0';
					}
					else if (typeUpdate == 'maintenance') {
						maintenance++;
						versionRelease = major.toString() + '.' + minor.toString() + '.' + maintenance.toString();
					}
				}
				else {
					vscode.window.showInformationMessage('Не найдена версия релиза ' + pathChangelog, 'Ok');
				}
				if (changelogData.startsWith('# История изменений')) {
					changelogData = changelogData.substring('# История изменений'.length);
				}
				firstCommit = cp.execSync('cd /D' + pathCreateChangelog.description + ' && git log -n 1 --pretty=format:%H -- CHANGELOG.md').toString();
			}
			axios.get(GITLAB_URL + '/api/v4/projects/' + idProject + '/repository/changelog?'
				+ 'version=' + versionRelease
				+ '&from=' + firstCommit
				+ '&to=' + lastCommit
				+ '&branch=' + currentBranch,
				{
					headers: {
						'PRIVATE-TOKEN': GITLAB_TOKEN
					}
				}).then(response => {
					if (!response.data['notes'].endsWith('Незначительные изменения\n') && !response.data['notes'].endsWith('No changes.\n')) {
						const writeBytes = Buffer.from('# История изменений\n\n' + response.data['notes'] + '\n' + changelogData);
						vscode.workspace.fs.writeFile(uriToFChangelog, writeBytes).then(() => {
							OpenFileVscode(uriToFChangelog);
						});
					}

				}
				)
		}
	}).catch(err => {
		return err;
	})
}

function GetBranchToCreateChangelog(gitBracnhes: string) {
	let regexpResult = /\*\s(\w*)/.exec(gitBracnhes);
	if (regexpResult && regexpResult[1]) {
		return regexpResult[1];
	}
	return '';
}
export function OpenUnitTest() {
	let fsPath = vscode.window.activeTextEditor?.document.uri.fsPath;
	if (fsPath == undefined) return;
	let pathTestScript = fsPath.replace('scripts\\libs\\', 'scripts\\tests\\libs\\');
	let uriToFileTests = vscode.Uri.parse("file:" + pathTestScript);
	if (!fs.existsSync(pathTestScript)) {
		let pathPvss = GetPvssPath() + '/data/hsp/templates/scriptEditor/newUnitTest.ctl';
		if (fs.existsSync(pathPvss)) {
			let fileData = fs.readFileSync(pathPvss, 'utf8');
			let splittedPath = fsPath.split('\\');
			let origLibName = splittedPath[splittedPath.length - 1].slice(0, -4);
			let resultReg = /scripts\\libs\\(.*)/.exec(fsPath);
			if (resultReg && resultReg[1]) {
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
	if (path == undefined || path == '') return;
	if (path.indexOf('\\panels\\') !== -1) {
		path = path.slice(path.indexOf("panels") + 7);
		let user = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("UserName");
		let pass = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("Password");
		let dollars = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("Dollars");
		let command = getPathInConfigFile('pvss_path') + '/bin/WCCOAui.exe -p ' + path + dollars + ' -user ' + user + ':' + pass + ' -proj ' + getPathInConfigFile('proj_name');
		const output = execShell(command);
	}
}

export function RunScript(uri: vscode.Uri) {
	let path = uri?.fsPath;
	if (path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
	if (path == undefined || path == '') return;
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
	if (path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
	if (path == undefined || path == '') return;
	let command, syntax = '';
	if (path.indexOf('\\scripts\\') !== -1) {
		let pathTestScript = path.replace(/scripts/g, 'scripts\\tests');
		let relPathScript = '';
		if (fs.existsSync(pathTestScript)) {
			relPathScript = pathTestScript.replace(/.*scripts\\/g, '');
		}
		else {
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
	if (winccLog_channel) {
		winccLog_channel.show(true);
		return;
	}
	let path = getPathInConfigFile('proj_path') + '/log/';
	if (path == '/log/' || !fs.existsSync(path)) {
		vscode.window.showErrorMessage('Не найден файл конфигурации');
		return;
	}
	winccLog_channel = vscode.window.createOutputChannel("WinccLogs");
	winccLog_channel.show(true);
	let fileNames = getFileNames(path);
	interface MyType {
		[key: string]: number;
	}
	let fileSizes: MyType = {};
	fileNames.forEach(element => {
		fileSizes[element] = fs.statSync(path + element).size;
	})
	while (doLogs) {
		fileNames.forEach(element => {
			let newSizeFile = fs.statSync(path + element).size;
			if (newSizeFile > fileSizes[element]) {
				let buffer = Buffer.alloc(newSizeFile - fileSizes[element]);
				fs.open(path + element, 'r+', function (err, fd) {
					if (err) {
						vscode.window.showErrorMessage(err.message);
						return;
					}
					fs.read(fd, buffer, 0, buffer.length, fileSizes[element], function (err, bytes) {
						if (bytes > 0) {
							let logs = buffer.slice(0, bytes).toString();
							addLogsToChanel(winccLog_channel, logs, element);
						}
						fs.close(fd);
					});
					fileSizes[element] = newSizeFile;
				});
			}
		})
		await delay(1000);
	}
}

function addLogsToChanel(chanel: vscode.OutputChannel, text: string, fileName: string) {
	if (fileName == 'PVSS_II.log') {
		let lines = text.split('\n');
		lines.forEach((item, index) => {
			if (!item.match(/.*,  INFO.*/i) && item != "") {
				chanel.append(item + "\n");
			}
		});
	}
	else chanel.append(text);
}
function getFileNames(path: string): string[] {
	let fileNames = fs.readdirSync(path).filter(element => {
		return element.indexOf('.log') > 0;
	})
	return fileNames;
}
function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function getPathInConfigFile(what: string): string {
	let path = '';
	let regexp: RegExp;
	if (what == 'proj_path') {
		regexp = /^proj_path = \"(.*)\"/;
	}
	else if (what == 'pvss_path') {
		regexp = /^pvss_path = \"(.*)\"/;
	}
	else if (what == 'proj_name') {
		regexp = /^proj_path = .*[\/ | \\](.*)"/;
	}
	else return '';
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders != undefined) {
		let fsPath = workspaceFolders[0].uri.fsPath;
		if (fs.existsSync(fsPath + '/config/config')) {
			let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
			let linesData = fileData.split('\n');
			linesData.forEach(line => {
				const matches = line.match(regexp) || [];
				if (matches.length > 0) {
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

export async function LoadDPL() {
    const result = await vscode.window.showQuickPick(GetDPLFiles());
    if (result != undefined) {
        prevSelectedItems.splice(1, 0, result);
        let path = result.description;
		if (path == undefined || path == '') return;
		if (path.indexOf('\\dplist\\') !== -1) {
			let user = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("UserName");
			let pass = vscode.workspace.getConfiguration("FixLineTool.OpenPanel").get("Password");
			let command = getPathInConfigFile('pvss_path') + '/bin/WCCOAascii.exe -user ' + user + ':' + pass + '-in ' + path + ' -yes -proj ' + getPathInConfigFile('proj_name');
			const output = execShell(command);
		}
    }
}

async function GetDPLFiles() {
	prevSelectedItems = prevSelectedItems.filter(onlyUnique);
	const files = await vscode.workspace.findFiles('**/dplist/**/*.dpl');
	const items: QuickPickItem[] = [];
	prevSelectedItems.forEach(item => {
		items.push(item);
	});
	files.forEach(file => {
		let path = file.fsPath;
		let splittedPath = path.split('dplist\\');
		items.push({
			label: '$(notebook-open-as-text) ' + splittedPath[splittedPath.length - 1],
			description: path
		});
	})
    return items;
}

export async function showQuickPick() {
	const result = await vscode.window.showQuickPick(GetPathsFiles());
	if (result != undefined) {
		prevSelectedItems.splice(1, 0, result);
		let path = result.description;
		OpenPanelWithPath(path);
	}
}
async function GetPathsFiles() {
	prevSelectedItems = prevSelectedItems.filter(onlyUnique);
	const files = await vscode.workspace.findFiles('**/panels/**/*.xml');
	const items: QuickPickItem[] = [];
	prevSelectedItems.forEach(item => {
		items.push(item);
	});
	files.forEach(file => {
		let path = file.fsPath;
		let splittedPath = path.split('panels\\');
		items.push({
			label: '$(notebook-open-as-text) ' + splittedPath[splittedPath.length - 1],
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

export function GetDirectories(directory: string): string[] {
	return fs.readdirSync(directory).filter(file => fs.statSync(path.join(directory, file)).isDirectory())
}


export function GetProjectsInConfigFile(withPvss = true): string[] {
	let paths = [];
	let regexp = /proj_path = \"(.*?)\"/g;
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders) {
		let fsPath = workspaceFolders[0].uri.fsPath;
		if (fs.existsSync(fsPath + '/config/config')) {
			let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
			let result;
			while (result = regexp.exec(fileData)) {
				if (result[1]) {
					paths.push(result[1]);
				}
			}
			if (withPvss) {
				result = /pvss_path = \"(.*?)\"/g.exec(fileData);
				if (result) {
					paths.push(result[1]);
				}
			}
		}
	}
	paths = paths.reverse();
	return paths;
}


export function GetPvssPath(): string {
	let paths: string = '';
	let regexp = /pvss_path = \"(.*?)\"/g;
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders) {
		let fsPath = workspaceFolders[0].uri.fsPath;
		if (fs.existsSync(fsPath + '/config/config')) {
			let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
			let result = regexp.exec(fileData);
			if (result != undefined && result[1]) {
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
