//-----------------------------------------------------------------------------
//uses
//-----------------------------------------------------------------------------

#uses "wizardFramework"

//-----------------------------------------------------------------------------
//variables
//-----------------------------------------------------------------------------

anytype anytype_var;
atime atime_var;
bit32 bit32_var;
bit64 bit64_var;
blob blob_var;
bool bool_var;
char char_var;
double double_var;
errClass errClass_var;
file file_var;
float float_var;
function_ptr function_ptr_var;
int int_var;
uint uint_var;
long long_var;
ulong ulong_var;
langString langString_var;
mixed mixed_var;
mapping mapping_var;
va_list va_list_var;
string string_var;
time time_var;
unsigned unsigned_var;
dbRecordset dbRecordset_var;
dbConnection dbConnection_var;
dbCommand dbCommand_var;
shape shape_var;
idispatch idispatch_var;

//dyn variables

dyn_anytype dyn_anytype_var;
dyn_atime dyn_atime_var;
dyn_bit32 dyn_bit32_var;
dyn_bit64 dyn_bit64_var;
dyn_blob dyn_blob_var;
dyn_bool dyn_bool_var;
dyn_char dyn_char_var;
dyn_errClass dyn_errClass_var;
dyn_float dyn_float_var;
dyn_int dyn_int_var;
dyn_uint dyn_uint_var;
dyn_long dyn_long_var;
dyn_ulong dyn_ulong_var;
dyn_langString dyn_langString_var;
dyn_mapping dyn_mapping_var;
dyn_string dyn_string_var;
dyn_time dyn_time_var;
dyn_shape dyn_shape_var;

//dyn_dyn variables

dyn_dyn_anytype dyn_dyn_anytype_var;
dyn_dyn_atime dyn_dyn_atime_var;
dyn_dyn_bit32 dyn_dyn_bit32_var;
dyn_dyn_bit64 dyn_dyn_bit64_var;
//dyn_dyn_blob dyn_dyn_blob_var; // does not exist
dyn_dyn_bool dyn_dyn_bool_var;
dyn_dyn_char dyn_dyn_char_var;
dyn_dyn_errClass dyn_dyn_errClass_var;
dyn_dyn_float dyn_dyn_float_var;
dyn_dyn_int dyn_dyn_int_var;
dyn_dyn_uint dyn_dyn_uint_var;
dyn_dyn_long dyn_dyn_long_var;
dyn_dyn_ulong dyn_dyn_ulong_var;
dyn_dyn_langString dyn_dyn_langString_var;
dyn_dyn_string dyn_dyn_string_var;
dyn_dyn_time dyn_dyn_time_var;
//dyn_dyn_shape dyn_dyn_shape; //does not exist

//-----------------------------------------------------------------------------
//constants
//-----------------------------------------------------------------------------

void constants()
{  
  //datatype constants 
  ATIME_VAR;
  BIT32_VAR;
  BOOL_VAR;
  BLOB_VAR;
  CHAR_VAR;
  DPIDENTIFIER_VAR;
  VA_LIST_VAR;
  FILE_VAR;
  FLOAT_VAR;
  INT_VAR;
  LANGSTRING_VAR;
  LONG_VAR;
  ULONG_VAR;
  STRING_VAR;
  TIME_VAR;
  MIXED_VAR;
  MAPPING_VAR;
  UINT_VAR;
  SHAPE_VAR;
  IDISPATCH_VAR;
  RECHDL_VAR;
  CONNHDL_VAR;
  CMDHDL_VAR;
  ANYTYPE_VAR;
  ERRCLASS_VAR;
  DYN_BIT32_VAR;
  DYN_BOOL_VAR;
  DYN_CHAR_VAR;
  DYN_DPIDENTIFIER_VAR;
  DYN_FLOAT_VAR;
  DYN_INT_VAR;
  DYN_LANGSTRING_VAR;
  DYN_LONG_VAR;
  DYN_ULONG_VAR;
  DYN_STRING_VAR;
  DYN_TIME_VAR;
  DYN_UINT_VAR;
  DYN_ATIME_VAR;
  DYN_SHAPE_VAR;
  DYN_IDISPATCH_VAR;
  DYN_RECHDL_VAR;
  DYN_CONNHDL_VAR;
  DYN_CMDHDL_VAR;
  DYN_MAPPING_VAR;
  DYN_MIXED_VAR;
  DYN_ANYTYPE_VAR;
  DYN_ERRCLASS_VAR;
  DYN_DYN_ANYTYPE_VAR;
  DYN_DYN_BIT32_VAR;
  DYN_DYN_BLOB_VAR;
  DYN_DYN_BOOL_VAR;
  DYN_DYN_CHAR_VAR;
  DYN_DYN_DPIDENTIFIER_VAR;
  DYN_DYN_ERRCLASS_VAR;
  DYN_DYN_FLOAT_VAR;
  DYN_DYN_INT_VAR;
  DYN_DYN_LANGSTRING_VAR;
  DYN_DYN_LONG_VAR;
  DYN_DYN_ULONG_VAR;
  DYN_DYN_STRING_VAR;
  DYN_DYN_TIME_VAR;
  DYN_DYN_UINT_VAR;
  DYN_DYN_MAPPING_VAR;
  DYN_DYN_MIXED_VAR;
  DYN_DYN_SHAPE_VAR;
  DYN_DYN_ATIME_VAR;
  DYN_DYN_IDISPATCH_VAR;
  DYN_DYN_RECHDL_VAR;
  DYN_DYN_CONNHDL_VAR;
  DYN_DYN_CMDHDL_VAR;
  
  //dpel constants
  DPEL_BIT32;
  DPEL_BIT32_STRUCT;
  DPEL_BIT64;
  DPEL_BLOB;
  DPEL_BLOB_STRUCT;
  DPEL_BOOL;
  DPEL_BOOL_STRUCT;
  DPEL_CHAR;
  DPEL_CHAR_STRUCT;
  DPEL_DPID;
  DPEL_DPID_STRUCT;
  DPEL_DYN_BIT32;
  DPEL_DYN_BIT32_STRUCT;
  DPEL_DYN_BIT64;
  DPEL_DYN_BIT64_STRUCT;
  DPEL_DYN_BLOB;
  DPEL_DYN_BLOB_STRUCT;
  DPEL_DYN_BOOL;
  DPEL_DYN_BOOL_STRUCT;
  DPEL_DYN_CHAR;
  DPEL_DYN_CHAR_STRUCT;
  DPEL_DYN_DPID;
  DPEL_DYN_DPID_STRUCT;
  DPEL_DYN_FLOAT;
  DPEL_DYN_FLOAT_STRUCT;
  DPEL_DYN_INT;
  DPEL_DYN_INT_STRUCT;
  DPEL_DYN_LANGSTRING;
  DPEL_DYN_LANGSTRING_STRUCT;
  DPEL_DYN_STRING;
  DPEL_DYN_STRING_STRUCT;
  DPEL_DYN_TIME;
  DPEL_DYN_TIME_STRUCT;
  DPEL_DYN_UINT;
  DPEL_DYN_UINT_STRUCT;
  DPEL_DYN_LONG;
  DPEL_DYN_LONG_STRUCT;
  DPEL_DYN_ULONG;
  DPEL_DYN_ULONG_STRUCT;
  DPEL_FLOAT;
  DPEL_FLOAT_STRUCT;
  DPEL_INT;
  DPEL_INT_STRUCT;
  DPEL_LANGSTRING;
  DPEL_LANGSTRING_STRUCT;
  DPEL_LONG;
  DPEL_LONG_STRUCT;
  DPEL_STRING;
  DPEL_STRING_STRUCT;
  DPEL_STRUCT;
  DPEL_TIME;
  DPEL_TIME_STRUCT;
  DPEL_TYPEREF;
  DPEL_UINT;
  DPEL_UINT_STRUCT;
  DPEL_ULONG;
  DPEL_ULONG_STRUCT;

  //other
  TRUE;
  FALSE;
}

//-----------------------------------------------------------------------------
//control structures
//-----------------------------------------------------------------------------

void control_structures()
{
  //if / else
  if ( int_var > 0 )
  {
  }
  else
  {
  }
  
  //switch / case / break / default
  switch (float_var)
  {
    case 1.0 :
    {
      break;
    }
 
    default:
    {
    }
  }
  
  //while / continue
  while (bool_var)
  {
    continue;
  }
  
  //for
  for (int i=1; i <10 ; i++)
  {
  } 
  
  //do-while
  do
  {
  }
  while(bool_var);
  
  //try / catch / finally / throw
  
  try
  {
    throw(errClass_var);      // optional
  }
  catch            
  {                                                       
  }
  finally         
  {                                 
  } 
}

//-----------------------------------------------------------------------------
//functions
//-----------------------------------------------------------------------------



main()
{
  /// stadard functions
  dpGet();
  float c = cos(4);

  bool b = dpExists();

  int rc = abortFileTransfer();
  
  /// some (lib finction)
  int i = foo();

// standard c function but not standard ctrl function
  _Exit();
  

// all standard ctrl functions

//A
int a = abortFileTransfer();
abs();
access();
acGetRefACType();
acos();
activateMode();
addGlobal();//Docu
addGroupPVSS();
addUserPVSS();
addUserToGroupPVSS();
addSymbol();
afterLogin();
alertConnect();//Docu
alertDisconnect();//Docu
alertGet();//Docu
alertGetPeriod();//Docu
alertSet();//Docu
alertSetTimed();//Docu
alertSetTimedWait();//Docu
alertSetWait();//Docu
animate();
asin();
assignPtr();
atan();
atan2();

//B
int b = base64Decode();
base64Encode();
beep();
baseName();
bitmapEditor();
blobAppendValue();
blobGetValue();
bloblen();
blobRead();
blobSetValue();
blobWrite();
blobZero();
byteSizeToString();

//C
callFunction();
captureScreen();
ceil();
changeLang();//Docu
checkPassword();
checkPattern();
checkQuery();
checkScript();
checkStringFormat();
ChildPanelOn(); //Docu
ChildPanelOnCentral();//Docu
ChildPanelOnCentralModal();//Docu
ChildPanelOnCentralModalReturn();//Docu
ChildPanelOnCentralReturn();//Docu
ChildPanelOnModal();//Docu
ChildPanelOnModalReturn();//Docu
ChildPanelOnModule();//Docu
ChildPanelOnModuleCheckPos();//Docu
ChildPanelOnModuleModal();//Docu
ChildPanelOnModuleModalReturn();//Docu
ChildPanelOnModuleReturn();//Docu
ChildPanelOnParent();//Docu
ChildPanelOnParentModal();//Docu
ChildPanelOnParentModalReturn();//Docu
ChildPanelOnParentReturn();//Docu
ChildPanelOnRelativ();//Docu
ChildPanelOnRelativModal();//Docu
ChildPanelOnRelativModalReturn();//Docu
ChildPanelOnRelativReturn();//Docu
childPanelOnReturn();//Docu
childPanelReturnValue();//Docu
clearLastError();
closeDialog();//Docu
closeProgressBar();
colorEditor();
colorGet();
colorGetActiveScheme();
colorGetAlias();
colorRemove();
colorSet();
colorSetActiveScheme();
colorSetAlias();
colorToRgb();
commonConfirm();
confirmMode();
connectedShapes();convManIdToInt();
convManIntToName();
copyAllFiles();
copyAllFilesRecursive();
copyFilecos();
cosh();
createAnimation();
createComObject();
createPanel();
createQRCodeFile();
createSymbol();
crypt();//Docu
cryptoHash();//Docu

//D
dataHost();
dataPort();
day();//Docu
daylightsaving();
daySecond();//Docu
dbAddNew();
dbBeginTransaction();
dbCloseConnection();
dbCloseRecordset();
dbCommitTransaction();
dbBulkCommand();
dbDelete();
dbEOF();
dbExecuteCommand();
dbFinishCommand();
dbGetError();
dbGetField();
dbGetRecord();
dbGetResult();
dbMove();
dbMoveFirst();
dbMoveLast();
dbMoveNext();
dbMovePrevious();
dbOpenConnection();
dbOpenRecordset();
dbPutField();
dbRequery();
dbRollbackTransaction();
dbSetParameter();
dbStartCommand();
dbUpdate();
Debug();//Docu
DebugBreak();//Docu
DebugFN();//Docu
DebugFTN();//Docu
DebugN();//Docu
DebugTN();//Docu
deg2rad();
delay();//Docu
delExt();
desDecrypt();
desEncrypt();
dirName();//Docu
dollarSubstitute();
dpActiveAlert();
dpAliasToName();
dpAttributeType();
dpCancelSplitRequest();
dpChange();
dpConnect();//Docu
dpConnectUserData();//Docu
dpCopy();//Docu
dpCopyBufferClear();
dpCopyConfig();//Docu
dpCopyConfigMerge();
dpCopyConfigMergeBufferClear();
dpCopyOriginal();
dpCreate();//Docu
dpDeactivateAlert();
dpDelete();//Docu
dpDisconnect();//Docu
dpDisconnectUserData();//Docu
dpElementType();
dpExists();//Docu
dpGet();//Docu
dpGetAlias();//Docu
dpGetAllAliases();
dpGetAllAttributes();
dpGetAllComments();
dpGetAllDescriptions();
dpGetAllConfigs();
dpGetAllDetails();
dpGetAsynch();//Docu
dpGetComment();//Docu
dpGetDescription();//Docu
dpGetDpTypeRefs();
dpGetFormat();//Docu
dpGetId();
dpGetMaxAge();
dpGetName();//Docu
dpGetPeriod();//Docu
dpGetPeriodSplit();
dpGetRefsToDpType();
dpGetStatusBit();
dpGetUnit();
dpIsLegalName();
dpNameCheck();
dpNames();//Docu
dpQuery();//Docu
dpQuerySplit();
dpQueryConnectAll();//Docu
dpQueryConnectSingle();//Docu
dpQueryDisconnect();//Docu
dpRename();
dpSelector();
dpSet();//Docu
dpSetAlias();//Docu
dpSetAndWaitForValue();
dpSetComment();//Docu
dpSetDescription();//Docu
dpSetDynErrorCheck();
dpSetErrorCheck();
dpSetFormat();
dpSetTimed();//Docu
dpSetTimedWait();
dpSetUnit();
dpSetWait();//Docu
dpSubStr();//Docu
dpTreeSetIcons();
dpTypeChange();
dpTypeCreate();
dpTypeDelete();
dpTypeGet();
dpTypeName();
dpTypeRefName();
dpTypes();//Docu
dpValToString();
dpWaitForValue();
dragStart();
dropAccept();
dynAppend();//Docu
dynAvg();
dynAvgWT();
dynClear();//Docu
dynContains();//Docu
dynCount();//Docu
dynDynSort();
dynDynTurn();
dynInsertAt();
dynIntersect();
dynlen();//Docu
dynMax();//Docu
dynMin();
dynPatternMatch();
dynRemove();//Docu
dynSort();//Docu
dynSortAsc();//Docu
dynSum();
dynUnique();

//E
emRetrieveMail();
emSendMail();
enableMenuItem();
enableSound();
errorDialog();
errorText();
evalScript();//Docu
eventHost();
eventPort();
execScript();
exit();//Docu
exp();

//F
fabs();
fclose();//Docu
feof();
ferror();
fflush();
fgets();
fileEditor();
fileSelector();
fileToString();
fillSelector();
floor();
fmod();
folderSelector();
fontSelector();
fopen();//Docu
formatSelector();
formatTime();//Docu
formatTimeUTC();
fprintf();
fprintfPL();
fprintfUL();
fputs();//Docu
fread();//Docu
fscanf();//Docu
fscanfPL();
fscanfUL();
fseek();
ftell();
fwrite();//Docu

//G
getACount();//Docu
getActiveHttpServerUrl();
getActiveLang();//Docu
getAIdentifier();
getAllDpAliases();
getAllGroupsPVSS();
getAllOSGroups();
getAllOSUsers();
getAllUsersPVSS();
getApplicationProperty();
getBit();
getCatStr();//Docu
getChildCentralPosition();
getClipboardText();
getColorNames();
getConfirmDps();
getCurrentDomainName();
getCurrentOSUser();
getCurrentTime();//Docu
getDictionary();
getDollarList();
getDollarParams();//Docu
getDollarParamsFromPanel();
getDollarValue();
getDomainOSUser();
getDynAnytype();
getenv();
getErrorCataloge();
getErrorCode();
getErrorDpName();
getErrorManId();
getErrorPriority();
getErrorStackTrace();
getErrorText();
getErrorType();
getErrorUserId();
getExt();
getFileCryptoHash();
getFileModificationTime();
getFileNames();
getFileNamesRev();
getFileSize();
getGediNames();
getGlobalLangId();
getGlobals();
getGlobalType();
getGroupDataPVSS();
getGroupsOfUserPVSS();
getHostByAddr();
getHostByName();
getHostname();
getInitialZoomFactor();
getKerberosSecurity();
getLangIdx();
getLastError();//Docu
getLastException();
getLicenseOption();
getLocale();
getManIdFromInt();
getMetaLang();
getMultiValue();
getNoOfLangs();
getOSDomainName();
getOSGroups();
getOSGroupID();
getOSGroupInfo();
getOSGroupName();
getOSGroupUsers();
getOSUserGroups();
getOSUserID();
getOSUserInfo();
getOSUserName();
getOSUsers();
getPanelPreview();
getPanelSize();
getParaNames();
getPendingFileTransferCount();
getPath();//Docu
getPrimaryScreen();
getPrinterNames();
getReduDp();
getRemoteSystemHosts();
getScaleStyle();
getScreenCount();
getScreenSize();
getScript();
getShape();//Docu
getShapes();//Docu
getStackTrace();
getSystemId();//Docu
getSystemName();//Docu
getSystemNames();//Docu
getThreadId();
getType();//Docu
getTypeName();//Docu
getUserDataPVSS();
getUiFunctionList();
getUIStyle();
getUserDataByNamePVSS();
getUserId();//Docu
getUserName();//Docu
getUserPermission();//Docu
getUserPermissionForArea();
getUsersInGroupPVSS();
getValue();//Docu
getVariable();
getVersionInfo();
getVisionNames();
getWindowsEvents();
getYoungerFiles();
getZoomFactor();
getZoomRange();
globalExists();
groupCreate();
groupDelete();
gunzip();
gzip();
gzread();
gzwrite();

//H
HOOK_aes_acknowledgeTableFunction();
HOOK_ep_acknowledgeTableFunction();
HOOK_isAckable();
hour();
html_ref();
httpCloseWebSocket();//Docu
httpConnect();//Docu
httpDisconnect();//Docu
httpGetHeader();
httpGetLanguage();
httpGetURI();
httpMakeParamString();
httpParseDate();
httpReadWebSocket();//Docu
httpSaveFilesFromUpload();
httpServer();//Docu
httpSetMaxAge();
httpSetMaxContentLength();
httpSetPermission();
httpWriteWebSocket();//Docu

//I
iec61850_createRcbDp();
iec61850_deleteRcbDp();
imageToFile();
invokeMethod();//Docu
isAckable();//Docu
isAlertAttribute();
isAnswer();
isConnActive();
isConnOpen();
isdir();
isDbgFlag();
isDirectory();
isDistributed();
isDollarDefined();
isDpTypeStruct();
isDpTypeSumAlert();
isEvConnOpen();
isfile();
isFunctionDefined();
isInBrowser();
isinf();
isModeExtended();
isModuleOpen();
isMotif();
isnan();
isPanelInGedi();
isPanelOpen();
isProgressBarOpen();
isReduActive();
isReduDp();
isRedundant();
isRefresh();
isRemoteSystemRedundant();
isSplitModeActive();
isTableAckable();

//J
jsonDecode();//Docu
jsonEncode();//Docu

//L
langEditor();
LayerOff();
LayerOffPanel();
LayerOffPanelInModule();
LayerOn();
LayerOnPanel();
LayerOnPanelInModule();
ldexp();
lineSelector();
log();
log10();
LoginDialog();
LogoutDialog();

//M
makeATime();//Docu
makeDynAnytype();//Docu
makeDynATime();//Docu
makeDynBit32();
makeDynBit64();
makeDynBool();//Docu
makeDynChar();
makeDynFloat();//Docu
makeDynInt();//Docu
makeDynLong();
makeDynMapping();//Docu
makeDynMixed();
makeDynShape();
makeDynString();//Docu
makeDynTime();//Docu
makeDynUInt();
makeError();//Docu
makeMapping();//Docu
makeNativePath();
makeTime();//Docu
makeUnixPath();
mappingClear();//Docu
mappingGetKey();
mappingGetValue();
mappingHasKey();//Docu
mappingKeys();
mappinglen();//Docu
mappingRemove();
maxFLOAT();
maxINT();
maxLONG();
maxUINT();
maxULONG();
mergeDictionary();
milliSecond();
minFLOAT();
minINT();
minLONG();
minUINT();
maxULONG();
minute();
mkdir();
moduleAddAction();
moduleAddDockModule();
moduleAddMenu();
moduleAddSubMenu();
moduleAddToolBar();
moduleSetAction();
moduleGetAction();
moduleHide();
moduleLower();
moduleMaximize();
moduleMinimize();
moduleOff();//Docu
ModuleOff();//Docu
moduleOn();//Docu
ModuleOn();//Docu
ModuleOnWithPanel();//Docu
moduleOriginalSize();
moduleRaise();
moduleRestore();
moduleSetAction();
moduleShow();
moduleShowFullScreen();
month();//Docu
moveFile();
moveModule();
mpGetMasterDpeForDpe();
mpHasDpeConfig();
msc_createFav();
msc_FavMenu();
msc_movePanel();
msc_moveToNextScreen();
msc_moveToPrevScreen();
msgCatEditor();
myDisplayName();
myManId();//Docu
myManNum();//Docu
myManType();//Docu
myModuleName();//Docu
myPanelName();//Docu
myReduHost();
myReduHostNum();
myUiDpName();
myWindowId();

//N
nameCheck();
netDelete();
netGet();//Docu
netHead();
netPost();//Docu
netPut();//Docu
numberMatch();

//O
OPCEnumQuery();
openAES();//Docu
openDialog();//Docu
openLogViewer();//Docu
openProgessBar();
openTrend();//Docu
openTrendCurves();
openUrl();//Docu

//P
paCfgDeleteValue();
paCfgInsertValue();
paCfgReadValue();
paCfgReadValueDflt();
paCfgReadValueList();
paIsRunAsAdmin();
panelFileName();
panelOff();//Docu
PanelOff();//Docu
PanelOffModule();//Docu
PanelOffPanel();//Docu
PanelOffReturn();//Docu
panelPosition();
panelSelector();
panelSize();
panelZoomIn();
panelZoomOut();
panningMode();
PasswordDialog();
patternMatch();
period();//Docu
popupMenu();
popupMenuXY();
popupMessage();
pow();
printPanel();
printRootPanel();
printTable();
pt_buildModuleName();
pt_moduleNumber();
pt_panelOn();
//Hier gibt es noch eineige pt_panelOn..2 ..3 ..und so. Das sollte dann aber rauskommen, wenn  die Ctrl Libs aausgelesen und erstellt werden
ptms_LoadOneBasePanel();
pvAddColumn();
pvAddSeparator();
pvConnect();
pvRefreshNode();
pvRemoveAllUserColumns();
pvSetItemText();

//Q
quarter();

//R
rad2deg();
rand();//Docu
readDictionary();
readSMS();
recode();
recodeFileName();
reduActive();
reduSetActive();
reduSetInactive();
reduSetPreferred();
reduSetSplitOff();
reduSetSplitOn();
reduSwitchDist();
reduSwitchDriver();
regexpIndex();
regexpLastIndex();
regexpSplit();
registerDbgFlag();
releaseComObject();
remove();
removeDoneCB();
removeGlobal();
removeGroupPVSS();
removeSymbol();
removeUserFromGroupPVSS();
rename();
requestFileList();
requestFileTransfer();
restorePanel();
rewind();
rootPanel();//Docu
RootPanelOn();//Docu
RootPanelOnModule();//Docu
rmdir();

//S
scanTimeUTC();
scriptEditor();
second();//Docu
seGetCursorPos();
seGetLine();
seGetSelectedText();
seInsertLine();
semAcquire();
semAvailable();
semRelease();
sendSMS();
seRemoveLine();
seSetCursorPos();
seSetLine();
setACount ();
setAIdentifier();
setApplicationProperty();
setBit();
setClipboardText();
setClutteringLimits();
setDbgFlag();
setDollarParams();//Docu
setenv();
setFileModificationTime();
setGroupNamePVSS();
setInputFocus();
setLangString();
setMultiValue();
setPanelSize();
setPattern();
setPeriod();
setQueryRDBDirect();
setScaleStyle();
setScript();
setScriptLangId();
setScriptUserId();
setTime();//Docu
setTrace();
setUserEnabledPVSS();
setUserId();
setUserNamePVSS();
setUserNameSSO();
setUserOsIDPVSS();
setValue();//Docu
setVariable();
shapeExists();//Docu
setWindowTitle();
showProgessBar();
sin();
sinh();
sizeof();
snmpMIBBrowserGetAdditionalInfos();
snmpMIBBrowserGetHierarchyNames();
sprintf();
sprintfPL();
sprintfUL();
sqrt();
srand();
sscanf();
sscanfPL();
sscanfUL();
startAnimation();
startPanelRefConstruct();
startSound();//Docu
startSymbol();
startThread();//Docu
stayOnTop();
std_help();
std_MiniHelp();
stopAnimation();
stopSound();//Docu
stopThread();//Docu
strchange();
strexpand();
strformat();
stringEditor();
strjoin();
strlen();//Docu
strltrim();//Docu
strpos();//Docu
strreplace();//Docu
strrtrim();//Docu
strsplit();//Docu
strtok();
strtolower();//Docu
strtoupper();//Docu
strwalk();
substr();//Docu
switchCtrlConnectionsToReplica();
switchCtrlConnectionToReplica();
switchUiConnectionsToReplica();
switchUiConnectionToReplica();
switchLang();//Docu
SwitchLayer();
SwitchLayerPanel();
SwitchLayerPanelInModule();
system();//Docu

//T
tan();
tanh();
tcpClose();//Docu
tcpOpen();//Docu
tcpRead();//Docu
tcpShutdownOutput();
tcpWrite();//Docu
textEditor();
throw();//Docu
throwError();//Docu
timeFromGMT();
timedFunc();//Docu
timedFuncCheckParams();
timedFuncEventCount();
timedFuncIntersect();
timedFuncRemove();
timedFuncStatus();
timedFuncConflicts();
timedFuncEvents();
titleBar();
tmpnam();
trackZoomMode();
translate();
triggerEvent();
triggerEventWait();

//U
udpClose();
udpOpen();
udpRead();
udpWrite();
uiConnect();
uniDynPatternMatch();
uniFPrintf();
uniFPrintfPL();
uniFPrintfUL();
uniSPrintf();
uniPatternMatch();
uniStrChange();
uniStrExpand();
uniStrFormat();
uniStrLen();
uniStrPos();
uniStrTok();
uniStrToLower();
uniStrToUpper();
uniSubStr();
useQueryRDBDirect();
useRDBArchive();
useRDBGroups();
userDefFunc();
usesTouchScreen();
useValueArchive();
uss_getGenericSetting();
uss_getMyUsergroup();
uss_getSpecificSetting();
uss_getSpecificUserSetting();
uss_getUserSettings();
usr_deleteSetting();

//V
v24Close();
v24Open();
v24Read();
v24Write();
valueEditor();
verifyOSUser();

//W
waitThread();
weekDay();
windowStyle();
writeAuditBatchEntry();
writeAuditEntry();
writeDictionary();
wss_getGenericSetting();
wss_getSpecificSetting();
wss_getSpecificWorkstationSetting();
wss_getWorkstationSettings();

//X
xmlAppendChild();
xmlChildNodes();
xmlCloseDocument();
xmlDocumentFromFile();
xmlDocumentFromString();
xmlDocumentToFile();
xmlDocumentToString();
xmlElementAttributes();
xmlGetElementAttribute();
xmlFirstChild();
xmlIsSameNode();
xmlNewDocument();
xmlNextSibling();
xmlNodeName();
xmlNodeType();
xmlNodeValue();
xmlParentNode();
xmlRemoveElementAttribute();
xmlRemoveNode();
xmlSetElementAttribute();
xmlSetNodeValue();
xmlrpcCall();
xmlrpcClient();
xmlrpcConnectToServer();
xmlrpcCloseServer();
xmlrpcDecodeRequest();
xmlrpcDecodeValue();
xmlrpcEncodeResponse();
xmlrpcEncodeValue();
xmlrpcHandler();
xmlrpcSetGzipLimit();

//Y
year();//Docu
yearDay();//Docu

//Z
ZoomModule();

//-----------------------------------------------------------------------------
//comments
//-----------------------------------------------------------------------------

//comment 1
/*comment 2*/
}

//-----------------------------------------------------------------------------
//keywords
//-----------------------------------------------------------------------------

/* block 
comment */

/** doxy block */

/* broken 
*/ comment
*/

auto
break
case
catch
const
continue
default
delete
do
else
enum
extern
false;
FALSE;
for(){}
goto
if
new
register
return
switch
try
volatile
while

false

class

nullptr
private
protected
public
short
signed
// sizeof --> this is function
static
struct
this
// throw --> this is function
true
TRUE
try{}
typedef
union
unsigned
void
volatile
while
int i = 2;
