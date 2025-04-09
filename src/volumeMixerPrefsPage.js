'use strict';

import { VolumeMixerAddFilterDialog } from "./volumeMixerAddFilterDialog";
import { VolumeMixerAddAliasDialog } from "./volumeMixerAddAliasDialog";

const { Adw, Gio, Gtk, GObject, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

export const VolumeMixerPrefsPage = GObject.registerClass({
    GTypeName: 'VolumeMixerPrefsPage',
}, class VolumeMixerPrefsPage extends Adw.PreferencesPage {
    filterListData = [];
    aliasListData = {};
    filteredAppsGroup;
    addFilteredAppButtonRow;
    aliasGroup;
    addAliasedAppButtonRow;
    settings;

    constructor() {
        // TODO: Move most of this into a .ui file.
        super();

        this.settings = ExtensionUtils.getSettings("net.evermiss.mymindstorm.volume-mixer");
        this.filterListData = this.settings.get_strv("filtered-apps");
        this.aliasListData = this.settings.get_value("aliased-apps").recursiveUnpack();

        // Group for general settings
        const generalGroup = new Adw.PreferencesGroup();
        this.add(generalGroup);

        // show-description
        const showDescRow = new Adw.ActionRow({ title: 'Show Audio Stream Description' });
        generalGroup.add(showDescRow);

        const showDescToggle = new Gtk.Switch({
            active: this.settings.get_boolean('show-description'),
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind(
            'show-description',
            showDescToggle,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        showDescRow.add_suffix(showDescToggle);
        showDescRow.activatable_widget = showDescToggle;

        // show-icon
        const showIconRow = new Adw.ActionRow({ title: 'Show Application Icon' });
        generalGroup.add(showIconRow);

        const showIconToggle = new Gtk.Switch({
            active: this.settings.get_boolean('show-icon'),
            valign: Gtk.Align.CENTER
        });
        this.settings.bind(
            'show-icon',
            showIconToggle,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        showIconRow.add_suffix(showIconToggle);
        showIconRow.activatable_widget = showIconToggle;

        // Application filter settings group
        const filterGroup = new Adw.PreferencesGroup({
            title: 'Application Filtering',
            description: 'Hide applications from the volume mixer.'
        });
        this.add(filterGroup);

        // filter-mode
        const filterModeModel = new Gio.ListStore({ item_type: FilterMode });
        filterModeModel.append(new FilterMode('Block', 'block'));
        filterModeModel.append(new FilterMode('Allow', 'allow'));

        const findCurrentFilterMode = () => {
            for (let i = 0; i < filterModeModel.get_n_items(); i++) {
                if (filterModeModel.get_item(i).value === this.settings.get_string('filter-mode')) {
                    return i;
                }
            }
            return -1;
        }

        const filterModeRow = new Adw.ComboRow({
            title: 'Filter Mode',
            model: filterModeModel,
            expression: new Gtk.PropertyExpression(FilterMode, null, 'name'),
            selected: findCurrentFilterMode()
        });
        filterGroup.add(filterModeRow);

        filterModeRow.connect('notify::selected', () => {
            this.settings.set_string('filter-mode', filterModeRow.selectedItem.value);
        });

        // group to act as spacer for filter list
        this.filteredAppsGroup = new Adw.PreferencesGroup();
        this.add(this.filteredAppsGroup);

        // List of filtered apps
        for (const filteredAppName of this.filterListData) {
            this.filteredAppsGroup.add(this.buildFilterListRow(filteredAppName))
        }

        // Add filter entry button
        this.createAddFilteredAppButtonRow();

        // Application aliases settings group
        this.aliasGroup = new Adw.PreferencesGroup({
            title: 'Application Aliases',
            description: 'Set aliases for applications.',
        });
        this.add(this.aliasGroup);
        
        // List of aliased apps
        for (const [aliasedAppName, aliasedAppAlias] of Object.entries(this.aliasListData)) {
            this.aliasGroup.add(this.buildAliasListRow(aliasedAppName, aliasedAppAlias))
          }

        // Add alias entry button
        this.createAddAliasedAppButtonRow();

        // TODO: modes
        // - group by application
        // - group by application but as a dropdown with streams
        // - show all streams
        // TODO: go thru github issues
        // popularity: page 26, 5th from the top
        // TODO: style
    }

    createAddFilteredAppButtonRow() {
        // I wanted to use Adw.PrefrencesRow, but you can't get the 'row-activated' signal unless it's part of a Gtk.ListBox.
        // Adw.PrefrencesGroup doesn't extend Gtk.ListBox.
        // TODO: Learn a less hacky to do this. I'm currently too new to GTK to know the best practice.
        this.addFilteredAppButtonRow = new Adw.ActionRow();
        const addIcon = Gtk.Image.new_from_icon_name("list-add");
        addIcon.height_request = 40
        this.addFilteredAppButtonRow.set_child(addIcon);
        this.filteredAppsGroup.add(this.addFilteredAppButtonRow);
        // It won't send 'activated' signal w/o this being set.
        this.addFilteredAppButtonRow.activatable_widget = addIcon;
        this.addFilteredAppButtonRow.connect('activated', (callingWidget) => {
            this.showFilteredAppDialog(callingWidget, this.filterListData)
        });
    }

    buildFilterListRow(filteredAppName) {
        const filterListRow = new Adw.PreferencesRow({
            title: filteredAppName,
            activatable: false,
        });

        // Make box for custom row
        const filterListBox = new Gtk.Box({
            margin_bottom:6,
            margin_top: 6,
            margin_end: 15,
            margin_start: 15
        });

        // Add title
        const filterListLabel = Gtk.Label.new(filterListRow.title);
        filterListLabel.hexpand = true;
        filterListLabel.halign = Gtk.Align.START
        filterListBox.append(filterListLabel);

        // Add remove button
        const filterListButton = new Gtk.Button({
            halign: Gtk.Align.END
        });

        // Add icon to remove button
        const filterListImage = Gtk.Image.new_from_icon_name("user-trash-symbolic");
        filterListButton.set_child(filterListImage);

        // Tie action to remove button
        filterListButton.connect("clicked", (_button) => this.removeFilteredApp(filteredAppName, filterListRow));

        filterListBox.append(filterListButton);
        filterListRow.set_child(filterListBox);

        return filterListRow
    }

    removeFilteredApp(filteredAppName, filterListRow) {
        this.filterListData.splice(this.filterListData.indexOf(filteredAppName), 1);
        this.settings.set_strv("filtered-apps", this.filterListData);
        this.filteredAppsGroup.remove(filterListRow);
    }

    addFilteredApp(filteredAppName) {
        this.filterListData.push(filteredAppName);
        this.settings.set_strv("filtered-apps", this.filterListData);
        this.filteredAppsGroup.remove(this.addFilteredAppButtonRow);
        this.filteredAppsGroup.add(this.buildFilterListRow(filteredAppName));
        this.filteredAppsGroup.add(this.addFilteredAppButtonRow);
    }

    showFilteredAppDialog(callingWidget, filterListData) {
        const dialog = new VolumeMixerAddFilterDialog(callingWidget, filterListData);
        dialog.connect('response', (_dialog, response) => {
            if (response === Gtk.ResponseType.OK) {
                this.addFilteredApp(dialog.appNameEntry.text);
            }
            dialog.close();
            dialog.destroy();
        });
        dialog.show();
    }

    createAddAliasedAppButtonRow() {
        // I wanted to use Adw.PrefrencesRow, but you can't get the 'row-activated' signal unless it's part of a Gtk.ListBox.
        // Adw.PrefrencesGroup doesn't extend Gtk.ListBox.
        // TODO: Learn a less hacky to do this. I'm currently too new to GTK to know the best practice.
        this.addAliasedAppButtonRow = new Adw.ActionRow();
        const addIcon = Gtk.Image.new_from_icon_name("list-add");
        addIcon.height_request = 40
        this.addAliasedAppButtonRow.set_child(addIcon);
        this.aliasGroup.add(this.addAliasedAppButtonRow);
        // It won't send 'activated' signal w/o this being set.
        this.addAliasedAppButtonRow.activatable_widget = addIcon;
        this.addAliasedAppButtonRow.connect('activated', (callingWidget) => {
            this.showAliasedAppDialog(callingWidget, this.aliasListData)
        });
    }

    buildAliasListRow(aliasedAppName, aliasedAppAlias) {
        const aliasListRow = new Adw.PreferencesRow({
            title: aliasedAppName + ": " + aliasedAppAlias,
            activatable: false,
        });

        // Make box for custom row
        const aliasListBox = new Gtk.Box({
            margin_bottom:6,
            margin_top: 6,
            margin_end: 15,
            margin_start: 15
        });

        // Add title
        const aliasListLabel = Gtk.Label.new(aliasListRow.title);
        aliasListLabel.hexpand = true;
        aliasListLabel.halign = Gtk.Align.START
        aliasListBox.append(aliasListLabel);

        // Add remove button
        const aliasListButton = new Gtk.Button({
            halign: Gtk.Align.END
        });

        // Add icon to remove button
        const aliasListImage = Gtk.Image.new_from_icon_name("user-trash-symbolic");
        aliasListButton.set_child(aliasListImage);

        // Tie action to remove button
        aliasListButton.connect("clicked", (_button) => this.removeAliasedApp(aliasedAppName, aliasListRow));

        aliasListBox.append(aliasListButton);
        aliasListRow.set_child(aliasListBox);

        return aliasListRow
    }

    removeAliasedApp(aliasedAppName, aliasListRow) {
        delete this.aliasListData[aliasedAppName]
        this.settings.set_value("aliased-apps", new GLib.Variant('a{ss}', this.aliasListData));
        this.aliasGroup.remove(aliasListRow);
    }

    addAliasedApp(aliasedAppName, aliasedAppAlias) {
        this.aliasListData[aliasedAppName] = aliasedAppAlias;
        this.settings.set_value("aliased-apps", new GLib.Variant('a{ss}', this.aliasListData));
        this.aliasGroup.remove(this.addAliasedAppButtonRow);
        this.aliasGroup.add(this.buildAliasListRow(aliasedAppName, aliasedAppAlias));
        this.aliasGroup.add(this.addAliasedAppButtonRow);
    }

    showAliasedAppDialog(callingWidget, aliasListData) {
        const dialog = new VolumeMixerAddAliasDialog(callingWidget, aliasListData);
        dialog.connect('response', (_dialog, response) => {
            if (response === Gtk.ResponseType.OK) {
                this.addAliasedApp(dialog.appNameEntry.text, dialog.appAliasEntry.text);
            }
            dialog.close();
            dialog.destroy();
        });
        dialog.show();
    }
});

const FilterMode = GObject.registerClass({
    Properties: {
        'name': GObject.ParamSpec.string(
            'name', 'name', 'name',
            GObject.ParamFlags.READWRITE,
            null),
        'value': GObject.ParamSpec.string(
            'value', 'value', 'value',
            GObject.ParamFlags.READWRITE,
            null),
    },
}, class FilterMode extends GObject.Object {
    _init(name, value) {
        super._init({ name, value });
    }
});
