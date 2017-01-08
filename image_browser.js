window.App = Ember.Application.create({
    rootElement: '#image-library'
});

Ember.onerror = function(error) {
   Ember.$.ajax('/api/error-notification', {
       type: 'POST',
       data: {
           stack: error.stack,
       }
   });
}

App.ApplicationAdapter = DS.RESTAdapter.extend({
    host: '/api',

    ajaxError: function ajaxError(jqXHR) {
        // send user to the login page if we get a 401 "unauthorized" from the
        // API backend.
        if (jqXHR.status === 401) {
            window.top.location.href = '/dashboard';
        }

        if (jqXHR) {
            jqXHR.then = null;
        }

        return jqXHR;
    }
});

App.Router.map(function () {
    this.route('images', { path: '/' }, function () {});
    this.route('image', { path: '/image/:image_id' }, function () {});
    this.route('stock_images', { path: '/stock_images' }, function () {});
    this.route('stock_image', { path: '/stock_image/:image_id' }, function () {});
});

Ember.Router.extend({
    rootURL: '/'
});

App.AccountImage = DS.Model.extend({
    filename: DS.attr(),
    file_path: DS.attr(),
    url: DS.attr(),
    thumbnailUrl: DS.attr(),
    inUse: DS.attr()
});

App.StockImage = DS.Model.extend({
    filename: DS.attr(),
    file_path: DS.attr(),
    url: DS.attr(),
    thumbnailUrl: DS.attr()
});

App.ImagesRoute = Ember.Route.extend({
    model: function model() {
        return this.store.findAll('account-image');
    }
});

App.ImageRoute = Ember.Route.extend({
    model: function model(params) {
        return this.store.findRecord('account-image', params.image_id);
    }
});

App.StockImagesRoute = Ember.Route.extend({
    model: function model() {
        return this.store.findAll('stock-image');
    }
});

App.StockImageRoute = Ember.Route.extend({
    model: function model(params) {
        return this.store.findRecord('stock-image', params.image_id);
    }
});

App.ImagesIndexRoute = Ember.Route.extend({
    actions: {
        select: function(image) {
            var url = image.get('url');
            window.opener.CKEDITOR.tools.callFunction(funcNum, url);
            window.close();
        }
    }
});

App.ImagesIndexController = Ember.Controller.extend({
    addImage: false,
    files: [],
    totalImagesDisplayed: 50,
    totalImages: 0,
    showLoadMoreButton: true,

    showAddButton: Ember.computed('selectedImages', function () {
        return this.get('selectedImages') > 0;
    }),

    sortProps: ['id:desc'],
    sortedImages: Ember.computed.sort('model', 'sortProps'),

    imagesCount: (function () {
        return this.get('model.length');
    }).property('model.[]'),

    actions: {
        upload: function() {
            var self = this;
            this.get('files').forEach(function (file) {
                var reader = new FileReader();

                // capture file information.
                reader.onload = (function() {
                    return function (e) {
                        var imageFile = e.target.result;

                        // create a model for image.
                        var image = self.store.createRecord('account-image', {
                            url: imageFile,
                            thumbnailUrl: imageFile });

                        var onSuccess = function onSuccess() {
                            Ember.$.notify("Added image to your library.", "success");

                            var url = image.get('url');
                            window.opener.CKEDITOR.tools.callFunction(funcNum, url);
                            window.close();
                        };

                        var onFail = function onFail() {
                            Ember.$.notify("Image could not be added.", "error");
                        };

                        // save model.
                        image.save().then(onSuccess, onFail);
                    };
                })(file);

                reader.readAsDataURL(file);
            });

            self.set('files', []);
        },

        getMoreImages: function() {
            var self = this;
            var query = { offset: this.get('totalImagesDisplayed') };

            this.store.query('account-image', query).then(function(data) {
                var meta = data.get('meta');
                self.set('totalImages', meta.total);

                var imagesReturned = data.get('content');
                if (imagesReturned.length === 0) {
                    self.set('showLoadMoreButton', false);
                }

                var totalImagesDisplayed = self.get('totalImagesDisplayed') + 50;
                self.set('totalImagesDisplayed', totalImagesDisplayed);
            });
        }
    }
});

App.StockImagesIndexController = Ember.Controller.extend({
    selectedImages: [],
    totalStockImagesDisplayed: 50,
    searchCriteria: '',

    imagesCount: (function () {
        return this.get('model.length');
    }).property('model.[]'),

    actions: {
        select: function(stockImage) {
            // create a model for image.
            var image = this.store.createRecord('account-image', {
                url: stockImage.get('url') });

            var onSuccess = function onSuccess(image) {
                Ember.$.notify("Added image to your library.", "success");

                var url = image.get('url');
                window.opener.CKEDITOR.tools.callFunction(funcNum, url);
                window.close();
            };

            var onFail = function onFail() {
                Ember.$.notify("Could not add image to your library.", "error");
            };

            // save model.
            image.save().then(onSuccess, onFail);
        },

        getMoreStockImages: function() {
            var self = this;
            var query = { offset: this.get('totalStockImagesDisplayed') };

            var searchCriteria = this.get('searchCriteria');
            if (searchCriteria !== '') {
                query.search = searchCriteria;
            }

            this.store.query('stock-image', query).then(function(data) {
                var totalStockImagesDisplayed = self.get('totalStockImagesDisplayed') + 50;
                self.set('totalStockImagesDisplayed', totalStockImagesDisplayed);
            });
        },

        search: function() {
            var searchCriteria = this.get('searchCriteria');
            var self = this;
            var query = { search: searchCriteria };

            this.store.query('stock-image', query).then(function(data) {
                self.get('model').clear();
                self.get('model').pushObjects(data.get('content'));
            });
        }
    }
});

App.OpenFileBrowserComponent = Ember.Component.extend({
    files: null,

    click: function click(event) {
        Ember.$('input[type=\'file\']').click();
    },

    didInsertElement: function didInsertElement() {
        Ember.$('input[type=\'file\']').click(function (event) {
            event.stopPropagation();
        });
    },

    change: function change(event) {
        var files = event.target.files;

        for (var i = 0; i < files.length; i++) {
            var file = files.item(i);

            // check file type.
            if (!file.type.match('image.*')) {
                Ember.$.notify("File is not an image!", "error");
                continue;
            }

            // check file size.
            if (file.size > 10000000) {
                Ember.$.notify("File size is too large!", "error");
                continue;
            }

            this.get('files').pushObject(file);
        }
        this.get('controller').send('upload');
    },

    actions: {
        upload: function upload() {
            // clear the file input so user can re-use it.
            Ember.$('input[type=\'file\']').val('');
            this.sendAction('action');
        }
    }
});

App.ImageBoxComponent = Ember.Component.extend({
    didInsertElement: function didInsertElement() {
        Ember.$('.image-box').imageCenterd({
            boxHeight: 200,
            imgClass: '.image-thumb'
        });
    },

    actions: {
        select: function() {
            this.sendAction('select', this.get('image'));
        }
    }
});

App.StockImageBoxComponent = Ember.Component.extend({
    selected: false,

    didInsertElement: function didInsertElement() {
        Ember.$('.image-box').imageCenterd({
            boxHeight: 200,
            imgClass: '.image-thumb'
        });
    },

    actions: {
        select: function() {
            this.sendAction('primary', this.get('image'));
        }
    }
});

App.ImageSelectComponent = Ember.Component.extend({
    actions: {
        select: function() {
            this.sendAction('action', this.get('image'));
        }
    }
});

App.SearchBoxComponent = Ember.Component.extend({
    didInsertElement: function() {
        Ember.$('.search').tagsinput({
            maxTags: 5
        });
    },

    keyPress: function(event) {
        // check if the "Enter" key was pressed.
        if (event.which === 13) {
            this.sendAction();
        }
    }
});
