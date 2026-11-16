import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
// Qt 6.12 adds its own Color type, so Omarchy's palette singleton must be
// qualified (docs/omarchy-shell.md, Theme tokens).
import qs.Commons as Commons
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
  property var state: ({ valid: false, known: false, silenced: false, owned: false, remaining: 0 })
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
  readonly property color ink: root.bar ? root.bar.foreground : Commons.Color.foreground
  readonly property color quietInk: root.bar ? Qt.darker(root.bar.foreground, 1.25) : Commons.Color.muted
  // Keyboard cursor, as in the first-party panels: hidden until the first arrow
  // key (or a hover), then Enter or Space activates the row it is on.
  property int cursorIndex: 0
  property bool cursorActive: false
  readonly property int actionCount: Model.actionCount(state)
  readonly property int cursorRow: Model.moveCursor(cursorIndex, 0, actionCount)
  function moveCursor(delta) { if (actionCount === 0) return; if (!cursorActive) { cursorActive = true; return } cursorIndex = Model.moveCursor(cursorRow, delta, actionCount) }
  function hoverRow(row) { if (actionCount === 0) return; cursorActive = true; cursorIndex = row }
  // Mouse and keyboard share this gate, so no row can run while the state is unread or unknown.
  function perform(row) { var args = Model.actionArgs(root.state, row); if (args) root.run(args) }
  function activateCursor() { if (cursorActive) perform(cursorRow) }
  onOpenedChanged: if (opened) { cursorActive = false; cursorIndex = 0 }
  Process { id: scanProc; command: [root.helperPath, "--scan"]; stdout: StdioCollector { waitForEnd: true; onStreamFinished: { var next = Model.parseState(text, root.nowMs); root.state = next.valid ? next : Model.unknownState(); root.loaded = true } } }
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
    contentWidth: panel.fittedContentWidth(Style.space(700)); contentHeight: panel.fittedContentHeight(content.implicitHeight)
    PanelKeyCatcher { id: keys; anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onMoveRequested: function(dx, dy) { root.moveCursor(dx !== 0 ? dx : dy) }
      // PanelKeyCatcher emits returnRequested THEN activateRequested on the same
      // Return press, so wiring both would run the action twice. Wire only
      // activateRequested (Space maps to it too, as in the first-party panels).
      onActivateRequested: root.activateCursor()
      Column { id: content; anchors.fill: parent; spacing: Style.space(10)
        PanelHero { title: Model.heroTitle(root.state, root.loaded); meta: Model.heroMeta(root.state, root.loaded); foreground: root.ink; fontFamily: root.bar ? root.bar.fontFamily : Style.font.family }
        PanelSeparator { foreground: root.ink }
        Rectangle { visible: root.loaded; width: parent.width - Style.space(32); x: Style.space(16); height: Style.space(62); radius: Style.space(5); readonly property real statusHue: Model.modeHue(root.state); color: Qt.hsla(statusHue, 0.46, 0.50, 0.11); border.color: Qt.hsla(statusHue, 0.55, 0.62, 0.72)
          Column { anchors.centerIn: parent; spacing: Style.space(3)
            Text { anchors.horizontalCenter: parent.horizontalCenter; text: Model.statusHeadline(root.state); textFormat: Text.PlainText; color: Qt.hsla(parent.parent.statusHue, 0.56, 0.70, 1); font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.bold: true; font.letterSpacing: 1 }
            Text { anchors.horizontalCenter: parent.horizontalCenter; text: Model.statusDetail(root.state); textFormat: Text.PlainText; width: Style.space(330); horizontalAlignment: Text.AlignHCenter; elide: Text.ElideRight; color: root.quietInk; font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.pixelSize: Style.font.caption }
          }
        }
        Row { width: parent.width - Style.space(32); x: Style.space(16); spacing: Style.space(10)
          Rectangle { id: quiet25; readonly property bool cursor: root.cursorActive && root.cursorRow === 0; width: (parent.width - parent.spacing) / 2; height: Style.space(50); radius: Style.space(5); opacity: root.actionCount > 0 ? 1 : 0.4; color: cursor ? Style.hoverFillFor(root.ink, Commons.Color.accent) : Qt.hsla(0.13, 0.48, 0.50, 0.12); border.width: cursor ? 2 : 1; border.color: cursor ? root.ink : Qt.hsla(0.13, 0.54, 0.64, 0.72); Accessible.role: Accessible.Button; Accessible.name: "Start 25 minute quiet session"; Accessible.onPressAction: root.perform(0)
            Text { anchors.centerIn: parent; text: "QUIET  25M"; textFormat: Text.PlainText; color: Qt.hsla(0.13, 0.56, 0.70, 1); font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.bold: true; font.letterSpacing: 1 }
            MouseArea { anchors.fill: parent; hoverEnabled: true; cursorShape: root.actionCount > 0 ? Qt.PointingHandCursor : Qt.ArrowCursor; onEntered: root.hoverRow(0); onClicked: root.perform(0) }
          }
          Rectangle { id: deep50; readonly property bool cursor: root.cursorActive && root.cursorRow === 1; width: (parent.width - parent.spacing) / 2; height: Style.space(50); radius: Style.space(5); opacity: root.actionCount > 0 ? 1 : 0.4; color: cursor ? Style.hoverFillFor(root.ink, Commons.Color.accent) : Qt.hsla(0.075, 0.48, 0.50, 0.12); border.width: cursor ? 2 : 1; border.color: cursor ? root.ink : Qt.hsla(0.075, 0.54, 0.64, 0.72); Accessible.role: Accessible.Button; Accessible.name: "Start 50 minute quiet session"; Accessible.onPressAction: root.perform(1)
            Text { anchors.centerIn: parent; text: "DEEP  50M"; textFormat: Text.PlainText; color: Qt.hsla(0.075, 0.56, 0.70, 1); font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.bold: true; font.letterSpacing: 1 }
            MouseArea { anchors.fill: parent; hoverEnabled: true; cursorShape: root.actionCount > 0 ? Qt.PointingHandCursor : Qt.ArrowCursor; onEntered: root.hoverRow(1); onClicked: root.perform(1) }
          }
        }
        Rectangle { id: endRow; visible: root.actionCount === 3; readonly property bool cursor: root.cursorActive && root.cursorRow === 2; width: parent.width - Style.space(32); x: Style.space(16); height: Style.space(34); radius: Style.space(4); color: cursor ? Style.hoverFillFor(root.ink, Commons.Color.accent) : "transparent"; border.width: cursor ? 2 : 1; border.color: cursor ? root.ink : (root.bar ? Qt.darker(root.bar.foreground, 1.45) : Commons.Color.muted); Accessible.role: Accessible.Button; Accessible.name: "End Quiet Queue session"; Accessible.onPressAction: root.perform(2)
          Text { anchors.centerIn: parent; text: "END THIS SESSION"; textFormat: Text.PlainText; color: root.quietInk; font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.pixelSize: Style.font.caption; font.bold: true }
          MouseArea { anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onEntered: root.hoverRow(2); onClicked: root.perform(2) }
        }
        Text { visible: root.loaded; text: Model.trustNote(); textFormat: Text.PlainText; width: parent.width - Style.space(32); x: Style.space(16); wrapMode: Text.WordWrap; color: root.bar ? Qt.darker(root.bar.foreground, 1.35) : Commons.Color.muted; font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.pixelSize: Style.font.caption }
        Text { visible: text !== ""; text: Model.keyHint(root.actionCount); textFormat: Text.PlainText; width: parent.width - Style.space(32); x: Style.space(16); wrapMode: Text.WordWrap; color: root.bar ? Qt.darker(root.bar.foreground, 1.35) : Commons.Color.muted; font.family: root.bar ? root.bar.fontFamily : Style.font.family; font.pixelSize: Style.font.caption }
        Item { width: 1; height: Style.space(4) }
      }
    }
  }
}
