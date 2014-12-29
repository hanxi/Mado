function DisplayManager(editor) {
    /* Outlets */
    this.conversionDiv = $("#html-conversion");

    /* Variables */
    this.currentGallery;
    this.editor = editor;
    this.galleries;
    this.imagesDisplayed = new ImageArray();
    this.imgFormats = ["png", "bmp", "jpeg", "jpg", "gif", "png", "svg", "xbm", "webp"]; // Authorized images' type.
    this.imageFound;
    this.loadedImagePath;
    this.imagePosition = 0;
    this.styleManager = new StyleManager();
    this.tempConversion; // Temporary conversion before it is displayed in the conversionDiv.
    this.urlManager = new UrlManager(this.conversionDiv);
}

DisplayManager.prototype = {
    constructor : DisplayManager,
    displayImages: function() {
        if (this.tempConversion.indexOf("<img src=\"", this.imagePosition) > -1) {
            console.log("Une image à afficher");
            this.imagePosition = this.tempConversion.indexOf("<img src=\"", this.imagePosition) + 10;
            this.loadedImagePath = this.tempConversion.substring(this.imagePosition, this.tempConversion.indexOf("\"", this.imagePosition));
            if (this.imgFormats.indexOf(this.loadedImagePath.substr(this.loadedImagePath.lastIndexOf('.') + 1).toLowerCase()) > -1) {
                if (this.imagesDisplayed.hasPath(this.loadedImagePath)) { // Image is already stored.
                    var image = this.imagesDisplayed.getImage(this.loadedImagePath);
                    this.tempConversion = this.tempConversion.substring(0, this.imagePosition) + image + this.tempConversion.substring(this.imagePosition + this.loadedImagePath.length); // Replace the path.
                    this.displayImages(); // Recursivity.
                } else if (this.loadedImagePath.substring(0, 7) == "http://" || this.loadedImagePath.substring(0, 8) == "https://") {
                    if (navigator.onLine) { // Online images
                        this.getOnlineImage();
                    } else {
                        tempConversion = tempConversion.substring(0, this.imagePosition - 10) + "<span class=\"nofile-link\"> <span class=\"nofile-visual\">" + chrome.i18n.getMessage("msgNoInternet") + "</span>&nbsp;</span><img class=\"nofile\" srcset=\"img/nointernet.png 1x, img/nointernet@2x.png 2x" + tempConversion.substring(this.imagePosition + this.loadedImagePath.length);
                    }
                } else {
                    console.log("Image hors ligne");
                    this.getOfflineImage();
                }
            } else if (this.loadedImagePath.substring(0, 5) != "data:" && this.loadedImagePath.substring(0, 5) != "blob:") {
                this.tempConversion = this.tempConversion.substring(0, this.imagePosition - 10) + "<span class=\"nofile-link\"> <span class=\"nofile-visual\">" + chrome.i18n.getMessage("msgNotAnImage") + "</span>&nbsp;</span><img class=\"nofile\" srcset=\"img/notimage.png 1x, img/notimage@2x.png 2x" + this.tempConversion.substring(this.imagePosition + this.loadedImagePath.length);;
                this.displayImages();
            }
        } else {
            console.log("Fin de la converrsion");
            this.imagesDisplayed.clean();
            this.imagePosition = 0;
            this.finishDisplaying();
        }
    },
    finishDisplaying: function() {
        this.conversionDiv.html(this.tempConversion);

        $("#html-conversion a").each(function() { // Add target="_blank" to make links work.
            if ($(this).attr("href").substring(0,1) != '#' && $(this).attr("href").substring(0,4) != "http") { // External link without correct syntax.
                $(this).attr("href", "http://" + $(this).attr("href"));
            }
            $(this).attr("target", "_blank");
        });

        $("#html-conversion .nofile, #html-conversion .nofile-link, #html-conversion .nofile-visual").on("click", $.proxy(function(e){ this.editor.setGalleries(); }, this)); // If an image isn't loaded, a default image appeared and, if the user clicks, the galleries choice appeared.
    },
    galleryAnalysis: function(index) {
        console.log("Visite de la galerie " + index);
        var t = this;
        if (! this.imageFound) {
            if (index < this.galleries.length) {
                this.currentGallery = index;
                this.galleries.forEach(
                    function(item, indx, arr) { // For each gallery.
                        if (indx == index && t.loadedImagePath != undefined && !t.imageFound) { // If we're looking for a file.
                            item.root.createReader().readEntries(function(entries) {
                                console.log(entries);
                                t.getImages(entries);
                            });
                        }
                    });
            } else {
                this.tempConversion = this.tempConversion.substring(0, this.imagePosition - 10) + "<span class=\"nofile-link\"> <span class=\"nofile-visual\">" + this.imagePath.replace(/\\/g, "/").substring(this.imagePath.lastIndexOf('/') + 1); + chrome.i18n.getMessage("msgNotFound") + "</span>&nbsp;</span><img class=\"nofile\" srcset=\"img/nofile.png 1x, img/nofile@2x.png 2x" + this.tempConversion.substring(this.imagePosition + this.loadedImagePath.length);
                this.displayImages();
            }
        }
    },
    getImages: function(entries) {
        console.log("On commence getImages avec " + entries);
        for (var i = 0; i < entries.length && !this.imageFound; i++) { // All the files in the repository, the correct file is not found yet.
            console.log(entries[i].fullPath);
            if (entries[i].isDirectory && this.loadedImagePath.indexOf(entries[i].fullPath) != -1) { // If the file is a directory and the right directory.
                entries[i].createReader().readEntries($.proxy(function(entries) {
                    this.getImages(entries);
                }, this));
                break;
            } else if (this.loadedImagePath.indexOf(entries[i].fullPath) != -1) { // It is the correct image!
                var t = this;
                t.galleries[t.currentGallery].root.getFile(entries[i].fullPath, {create: false}, function(fileEntry) { // Time to get the ID of the file.
                    fileEntry.file(function(theFile) {
                        var reader = new FileReader();
                        reader.onloadend = function(e) { // We have the file (.result).
                            t.imagesDisplayed.addImage(t.loadedImagePath, e.srcElement.result); // Add a new line.
                            t.tempConversion = t.tempConversion.substring(0, t.imagePosition) + e.srcElement.result + t.tempConversion.substring(t.imagePosition + t.loadedImagePath.length); // Replace the path.
                            t.imageFound = true;
                            t.displayImages();
                        };
                        reader.readAsDataURL(theFile);
                    });
                });
                break;
            } else if (i == (entries.length - 1)) { // End of the gallery.
                this.galleryAnalysis(this.currentGallery + 1); // We're searching the next gallery.
            }
        }
    },
    getOfflineImage: function() {
        this.imageFound = false;
        chrome.mediaGalleries.getMediaFileSystems({ interactive : "no" }, $.proxy(function(galleries) {
            this.galleries = galleries;
            this.galleryAnalysis(0);
        }, this));
    },
    getOnlineImage: function() {
        var xhr = new XMLHttpRequest();
        xhr.responseType = "blob";
        xhr.onload = $.proxy(function() {
            var webImage = window.URL.createObjectURL(xhr.response);
            this.imagesDisplayed.addImage(this.loadedImagePath, webImage); // Add a new line.
            this.tempConversion = this.tempConversion.substring(0, this.imagePosition) + webImage + this.tempConversion.substring(this.imagePosition + this.loadedImagePath.length); // Replace the path.
            this.displayImages();
        }, this);
        xhr.open('GET', this.loadedImagePath, true);
        xhr.send(this.loadedImagePath);
    },
    update: function() {
        if (this.editor.getLength() > 0) { // There is Markdown in the textarea.
            this.tempConversion = marked(this.editor.getMarkdown());
            this.displayImages(); // We will finish displaying it after displaying every images.
        } else { // No Markdown here.
            this.conversionDiv.html(chrome.i18n.getMessage("msgNoTextInEditor"));
        }
    }
}
