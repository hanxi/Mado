window.onload = function() {
    var editor = new Editor();
    var helpManager = new HelpManager();
    var app = new App(editor);
    var appWindow = new Window(app);
}
