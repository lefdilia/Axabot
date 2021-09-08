(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*jshint esversion: 6 */

$.fn.editable = function (options) {
    var STYLE_EDITABLE = {
        "cursor": "pointer",
        "text-decoration": "underline",
        "text-decoration-style": "dotted"
    };

    options = options || {};
    options.onChange = typeof options.onChange === 'function' ? options.onChange : function () {};

    function applyStyle(element, style) {
        Object.keys(style).forEach(function (property) {
            element.style[property] = style[property];
        });
    }

    function isNewValueValid(newValue, oldValue) {
        return newValue.trim() !== '' && oldValue !== newValue;
    }

    function setEditableElementValue(editableElement, parent, event) {
        var newValue = event.target.value;
        var oldValue = editableElement.textContent;

        if (!isNewValueValid(newValue, oldValue)) {
            return;
        }

        // if the new value is valid, we set it and trigger the user's callback.
        editableElement.textContent = newValue;

        setTimeout(function () {
            options.onChange({
                parent: parent,
                editableElement: editableElement,
                event: event,
                oldValue: oldValue,
                newValue: newValue
            });
        }, 100);
    }

    function setParent(parent, content, width) {
        parent.classList = '';
        parent.style.width = width;
        parent.innerHTML = content;
        parent.style.height = '4px';
    }

    function setInput(input) {
        input.focus();
        input.select();
    }

    function toInput(editableElement) {
        var parent = editableElement.parentElement;
        var type = editableElement.hasAttribute('type') ? editableElement.getAttribute('type') : 'text';
        var parentClassList = [].concat(_toConsumableArray(parent.classList));

        // Since we can't submit a form on "enter" whenever there is only one input in the form, a ghost one has been added.
        var wrapper = "\n            <input type=\"text\" style=\"display:none\"/>\n            <div class=\"form-group\" style=\"margin: 0px;\">\n                <input type=\"" + type + "\" class=\"form-control eip-editable input-sm\" value=\"" + editableElement.textContent + "\"/>\n            </div>\n        ";

        setParent(parent, wrapper, parent.clientWidth + "px");
        var input = parent.querySelector('.eip-editable');
        setInput(input);

        // setTimeout so we don't block the UI. Check the following link for further infos:
        // https://stackoverflow.com/questions/42266929/click-after-blur-doesnt-work
        input.addEventListener('blur', function (event) {
            setTimeout(function () {
                setEditableElementValue(editableElement, parent, event);
                toEditableElement(parent, editableElement, parentClassList);
            }, 100);
        });

        input.addEventListener('keyup', function (ev) {
            ev.preventDefault();
            switch (ev.keyCode) {
                case 13:
                    // ENTER - apply value
                    setEditableElementValue(editableElement, parent, ev);
                    toEditableElement(parent, editableElement, parentClassList);
                    break;
                case 27:
                    // ESC - get back to old value
                    toEditableElement(parent, editableElement, parentClassList);
                    break;
            }
        });
    }

    function toEditableElement(parent, editableElement, parentClassList) {
        parent.classList = parentClassList.join(' ');
        parent.innerHTML = "";
        parent.appendChild(editableElement);
    }

    $.each($(this), function (index, editableElement) {
        applyStyle(editableElement, STYLE_EDITABLE);
        $(editableElement).on('click', function (ev) {
            return toInput(ev.target);
        });
    });
};

},{}]},{},[1]);
