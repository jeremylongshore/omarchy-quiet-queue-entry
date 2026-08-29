import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

Panel {
  id: root
  moduleName: "io.github.jeremylongshore.quiet-queue"
  ipcTarget: "io.github.jeremylongshore.quiet-queue"
  manageIpc: false
  property var anchorItem: null
  property var hostWidget: null
  property bool openedFromHotkey: false
  readonly property var barIdentity: hostWidget || root
  readonly property string helperPath: Qt.resolvedUrl("bin/quiet-queue").toString().replace(/^file:\/\//, "")
  property var state: ({ valid: false, silenced: false, owned: false, remaining: 0 })
  property bool loaded: false
  property double nowMs: Date.now()
  readonly property bool isAlert: state.silenced
  readonly property string label: loaded ? Model.pillText(state) : "QUEUE"
  readonly property string tooltip: loaded ? Model.tooltipText(state) : "Reading notification mode…"
  function open() { openedFromHotkey = false; root.controller.show(); root.refresh() }
  function openFromHotkey() { openedFromHotkey = true; root.controller.show(); root.refresh() }
  function close() { root.controller.hide() }
  function toggle() { if (root.opened) root.close(); else root.openFromHotkey() }
  function switchPanel(direction) { return root.bar && typeof root.bar.switchPanelFrom === "function" ? root.bar.switchPanelFrom(root.barIdentity, direction) : false }
  function refresh() { nowMs = Date.now(); if (!scanProc.running) scanProc.running = true }
  function run(args) { if (!actionProc.running) { actionProc.command = [root.helperPath].concat(args); actionProc.running = true } }
  Process { id: scanProc; command: [root.helperPath, "--scan"]; stdout: StdioCollector { waitForEnd: true; onStreamFinished: { var next = Model.parseState(text, root.nowMs); if (next.valid) { root.state = next; root.loaded = true } } } }
  Process {
    id: actionProc
    command: []
    stdout: StdioCollector { waitForEnd: true; onStreamFinished: root.refresh() }
    onExited: root.refresh()
  }
  Timer { interval: 5000; running: true; repeat: true; triggeredOnStart: true; onTriggered: root.refresh() }
  IpcHandler { target: root.ipcTarget; function open(): void { root.openFromHotkey() } function close(): void { root.close() } function show(): void { root.openFromHotkey() } function hide(): void { root.close() } function toggle(): void { root.toggle() } function refresh(): void { if (root.hostWidget && typeof root.hostWidget.broadcast === "function") root.hostWidget.broadcast("refresh"); else root.refresh() } }
  KeyboardPanel {
    id: panel; anchorItem: root.anchorItem; owner: root.barIdentity; bar: root.bar; open: root.opened; centerOnBar: true; focusTarget: keys
    contentWidth: panel.fittedContentWidth(Style.space(430)); contentHeight: panel.fittedContentHeight(content.implicitHeight)
    PanelKeyCatcher { id: keys; anchors.fill: parent; onCloseRequested: root.close(); onTabRequested: function(direction) { root.switchPanel(direction) }
      Column { id: content; anchors.fill: parent; spacing: Style.space(10)
        PanelHero { title: !root.loaded ? "READING QUIET MODE" : (root.state.silenced ? "NOTIFICATIONS QUEUED" : "NOTIFICATIONS FLOWING"); meta: !root.loaded ? "Checking Omarchy's local notification toggle." : (root.state.owned ? "Quiet Queue owns this focus session: " + Model.timeLabel(root.state.remaining) : (root.state.silenced ? "Silenced outside Quiet Queue. History remains available in Omarchy." : "Start a bounded quiet session. Nothing is discarded.")); foreground: root.bar ? root.bar.foreground : Color.foreground; fontFamily: root.bar ? root.bar.fontFamily : Style.font.family }
        PanelSeparator { foreground: root.bar ? root.bar.foreground : Color.foreground }
        Rectangle { visible: root.loaded; width: parent.width - Style.space(32); x: Style.space(16); height: Style.space(62); radius: Style.space(5); readonly property real statusHue: Model.modeHue(root.state); color: Qt.hsla(statusHue, 0.46, 0.50, 0.11); border.color: Qt.hsla(statusHue, 0.55, 0.62, 0.72)
          Column { anchors.centerIn: parent; spacing: Style.space(3)
            Text { anchors.horizontalCenter: parent.horizontalCenter; text: root.state.silenced ? (root.state.owned ? "FOCUS SESSION ACTIVE" : "NATIVE DND ACTIVE") : "NOTIFICATIONS OPEN"; textFormat: Text.PlainText; color: Qt.hsla(parent.parent.statusHue, 0.56, 0.70, 1); font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.bold: true; font.letterSpacing: 1 }
            Text { anchors.horizontalCenter: parent.horizontalCenter; text: root.state.owned ? Model.timeLabel(root.state.remaining) + " REMAINING" : (root.state.silenced ? "QUIET QUEUE WILL NOT TURN THIS OFF" : "CHOOSE A BOUNDED QUIET SESSION"); textFormat: Text.PlainText; width: Style.space(330); horizontalAlignment: Text.AlignHCenter; elide: Text.ElideRight; color: root.bar ? Qt.darker(root.bar.foreground, 1.25) : Color.muted; font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.pixelSize: Style.font.caption }
          }
        }
        Row { width: parent.width - Style.space(32); x: Style.space(16); spacing: Style.space(10)
          Rectangle { width: (parent.width - parent.spacing) / 2; height: Style.space(50); radius: Style.space(5); color: Qt.hsla(0.13, 0.48, 0.50, 0.12); border.color: Qt.hsla(0.13, 0.54, 0.64, 0.72); Accessible.role: Accessible.Button; Accessible.name: "Start 25 minute quiet session"
            Text { anchors.centerIn: parent; text: "QUIET  25M"; textFormat: Text.PlainText; color: Qt.hsla(0.13, 0.56, 0.70, 1); font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.bold: true; font.letterSpacing: 1 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.run(["--start", "1500"]) }
          }
          Rectangle { width: (parent.width - parent.spacing) / 2; height: Style.space(50); radius: Style.space(5); color: Qt.hsla(0.075, 0.48, 0.50, 0.12); border.color: Qt.hsla(0.075, 0.54, 0.64, 0.72); Accessible.role: Accessible.Button; Accessible.name: "Start 50 minute quiet session"
            Text { anchors.centerIn: parent; text: "DEEP  50M"; textFormat: Text.PlainText; color: Qt.hsla(0.075, 0.56, 0.70, 1); font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.bold: true; font.letterSpacing: 1 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.run(["--start", "3000"]) }
          }
        }
        Rectangle { visible: root.state.owned; width: parent.width - Style.space(32); x: Style.space(16); height: Style.space(34); radius: Style.space(4); color: "transparent"; border.color: root.bar ? Qt.darker(root.bar.foreground, 1.45) : Color.muted; Accessible.role: Accessible.Button; Accessible.name: "End Quiet Queue session"
          Text { anchors.centerIn: parent; text: "END THIS SESSION"; textFormat: Text.PlainText; color: root.bar ? Qt.darker(root.bar.foreground, 1.25) : Color.muted; font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.pixelSize: Style.font.caption; font.bold: true }
          MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.run(["--end"]) }
        }
        Text { visible: root.loaded; text: "Omarchy keeps silenced notifications in its native history. Quiet Queue never reads notification contents."; textFormat: Text.PlainText; width: parent.width - Style.space(32); x: Style.space(16); wrapMode: Text.WordWrap; color: root.bar ? Qt.darker(root.bar.foreground, 1.35) : Color.muted; font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.pixelSize: Style.font.caption }
        Item { width: 1; height: Style.space(4) }
      }
    }
  }
}
