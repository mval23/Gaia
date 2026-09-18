' Double-click to run Gaia without a console window.
'
' All the real work stays in "Start Gaia.bat". This only launches it hidden
' (the 0) and returns straight away (the False), so nothing is left on screen
' and the dev server keeps running in the background. Because there is then no
' window to close, stop Gaia with "Stop Gaia.bat".

Dim shell, here
Set shell = CreateObject("WScript.Shell")
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
shell.CurrentDirectory = here
shell.Run """" & here & "Start Gaia.bat"" --hidden", 0, False
