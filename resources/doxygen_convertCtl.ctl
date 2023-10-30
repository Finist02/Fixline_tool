// $License: NOLICENSE
//--------------------------------------------------------------------------------
/**
	@file $relPath
	@copyright $copyright
	@author Danil
*/

//--------------------------------------------------------------------------------
// Libraries used (#uses)
#uses "classes/doxygen/ext/DoxygenCtrlFile"


//--------------------------------------------------------------------------------
// Variables and Constants

//--------------------------------------------------------------------------------
/**
*/
main(string filePath, string workDirectory)
{
	DoxygenCtrlFile ctrlFile = DoxygenCtrlFile(filePath);
	ctrlFile.stripFromPath(workDirectory);
	ctrlFile.convert();
}
