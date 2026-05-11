Set WshShell = WScript.CreateObject("WScript.Shell")

' Abre o Firefox já com seu projeto
WshShell.Run "firefox.exe http://localhost:3000/"

' Aguarda carregar
WScript.Sleep 4000

' Ativa modo responsivo (Ctrl + Shift + M)
WshShell.SendKeys "^+m"