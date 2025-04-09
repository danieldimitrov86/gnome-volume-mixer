'use strict';

const { Gtk, GObject } = imports.gi;

export const VolumeMixerAddAliasDialog = GObject.registerClass({
    GTypeName: 'VolumeMixerAddAliasDialog',
}, class VolumeMixerAddAliasDialog extends Gtk.Dialog {
    appNameEntry;
    appAliasEntry;
    aliasListData;

    constructor(callingWidget, aliasListData) {
        super({
            use_header_bar: true,
            transient_for: callingWidget.get_root(),
            destroy_with_parent: true,
            modal: true,
            resizable: false,
            title: "Add Aliased Application"
        });

        this.aliasListData = aliasListData;

        const addButton = this.add_button("Add", Gtk.ResponseType.OK);
        addButton.get_style_context().add_class('suggested-action');
        addButton.sensitive = false;
        this.add_button("Cancel", Gtk.ResponseType.CANCEL);

        const dialogContent = this.get_content_area();
        dialogContent.margin_top = 20
        dialogContent.margin_bottom = 20
        dialogContent.margin_end = 20
        dialogContent.margin_start = 20

        const appNameLabel = new Gtk.Label({
            label: "Application name",
            halign: Gtk.Align.START,
            margin_bottom: 10
        });
        dialogContent.append(appNameLabel);

        this.appNameEntry = new Gtk.Entry();
        this.appNameEntry.connect('activate', () => {
            if (this.checkInputValid()) {
                this.response(Gtk.ResponseType.OK)
            }
        })
        dialogContent.append(this.appNameEntry);

        this.appNameEntry.connect("changed", () => {
            addButton.sensitive = this.checkInputValid();
        });

        const appAliasLabel = new Gtk.Label({
            label: "Application alias",
            halign: Gtk.Align.START,
            margin_top: 10,
            margin_bottom: 10
        });
        dialogContent.append(appAliasLabel);

        this.appAliasEntry = new Gtk.Entry();
        this.appAliasEntry.connect('activate', () => {
            if (this.checkInputValid()) {
                this.response(Gtk.ResponseType.OK)
            }
        })
        dialogContent.append(this.appAliasEntry);

        this.appAliasEntry.connect("changed", () => {
            addButton.sensitive = this.checkInputValid();
        });
    }

    checkInputValid() {
        return this.checkNameValid() && this.checkAliasValid();
    }

    checkNameValid() {
        if (this.appNameEntry.text.length === 0) {
            return false;
        } else if (this.aliasListData[this.appNameEntry.text] !== undefined) {
            return false;
        } else {
            return true;
        }
    }

    checkAliasValid() {
        return this.appAliasEntry.text.length !== 0
    }
});
