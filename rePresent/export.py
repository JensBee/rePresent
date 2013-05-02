#!/usr/bin/env python2
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see http://www.gnu.org/licenses/.

import random
import inkex
import inkinkex
import os
import re
import sys
import json
_ = inkex._

VERSION = "0.1"

NS = u"https://github.com/JensBee/rePresent"
NSS = {
    'inkscape': '{' + inkex.NSS['inkscape'] + '}',
    'sodipodi': '{' + inkex.NSS['sodipodi'] + '}',
    'svg': '{' + inkex.NSS['svg'] + '}',
    'xlink': '{' + inkex.NSS['xlink'] + '}',
    'represent': '{' + NS + '}'
}

CSS_FONT_ATTRIBUTES = ['-inkscape-font-specification',
                       'font-family',
                       'font-size', 'font-stretch',
                       'font-style', 'font-variant', 'font-weight']
CSS_REMOVE_ATTRIBUTES = ['line-height'] + CSS_FONT_ATTRIBUTES
INKSCAPE_KEEP_ATTRIBUTES = []  # ['groupmode', 'label']


def styleToDict(style):
    u"""Convert style attribute content to a dict type."""
    if len(style):
        return dict([i.split(":") for i in style.split(";") if len(i)])
    return {}


def styleDictToStr(style):
    u"""Flattens a element style dict into an attribute string."""
    if len(style):
        return ';'.join(['%s:%s' % (attr, value) for
                       (attr, value) in style.items()])
    return ""


def setStyle(node, style):
    u"""Set or update the style attribute values for a given element."""
    if 'style' in node.attrib.keys():
        currStyle = styleToDict(node.get('style'))
        currStyle.update(style)
        node.set('style', styleDictToStr(currStyle))
    else:
        node.set('style', styleDictToStr(style))


def setAttributes(node, attributes):
    if len(attributes):
        for (attr, value) in attributes.items():
            if attr == 'style':
                setStyle(node, value)
            else:
                node.set(attr, value)


class RePresentDocument(inkinkex.InkEffect):
    config = {
        # index view configuration
        'index': {
            # spacing between slides in index view
            'spacing': "10",
        }
    }
    NODE_TYPES = {
        'other': -1,
        'gmaster': 0,
        'master': 1,
        'ngroup': 2,
        'part': 3,
        'slide': 4,
        'group': 5,
        'partParent': 6
    }

    def __init__(self):
        inkinkex.InkEffect.__init__(self)
        inkex.NSS[u"represent"] = NS  # seems to have no effect
        self.nodes = {
            'masters': None,  # svg group layer for all master layer defs
            'masterGlobal': None,  # global master layer defs
            'slides': None,  # svg group layer for all slide layer defs
            'slidesStack': None  # svg group layer for linked slides from defs
        }
        self.config = RePresentDocument.config.copy()

    def output(self):
        u"""Write the final document."""
        self.document.write(sys.stdout)

    def prepareSvg(self):
        u"""Add some elements needed for structuring the presentation."""
        root = self.document.getroot()
        setAttributes(root, {NSS['represent'] + 'version': VERSION})

        # set the background color
        baseNode = root.xpath('//sodipodi:namedview[@id="base"]',
                              namespaces=inkex.NSS)
        if len(baseNode) and 'pagecolor' in baseNode[0].attrib:
            setStyle(root, {'background-color': baseNode[0].get('pagecolor')})
        else:
            setStyle(root, {'background-color': "#000"})

        # get drawing size
        size = (root.get('width'), root.get('height'))

        # add clipping path to restrict slides content to drawing area
        defs = root.xpath('//svg:defs', namespaces=inkex.NSS)
        if not len(defs):
            defNode = inkex.etree.Element(inkex.addNS('defs'))
            root.append(defNode)
            defs = [defNode]
        defs = defs[0]
        rectNode = inkex.etree.Element(inkex.addNS('rect'))
        setAttributes(rectNode, {
            'x': "0",
            'y': "0",
            'width': size[0],
            'height': size[1]
        })
        clipNode = inkex.etree.Element(inkex.addNS('clipPath'))
        setAttributes(clipNode, {
            'id': "rePresent-slide-clip",
            'clipPathUnits': "userSpaceOnUse"
        })
        clipNode.append(rectNode)
        defs.append(clipNode)

        # all local masters will be stored in one layer for later referencing
        self.nodes['masters'] = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(self.nodes['masters'], {
            'id': "rePresent-slides-masters"
        })
        defs.append(self.nodes['masters'])

        # all slides will be stored in one layer
        self.nodes['slides'] = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(self.nodes['slides'], {
            'id': "rePresent-slides"
        })
        defs.append(self.nodes['slides'])

        # all global masters will be stored in one layer used as background
        self.nodes['masterGlobal'] = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(self.nodes['masterGlobal'], {
                      'id': "rePresent-slides-gmaster",
                      'style': {'display': 'inline'}
                      })
        root.append(self.nodes['masterGlobal'])

        # display order of slides is stored in a seperate layer
        self.nodes['slidesStack'] = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(self.nodes['slidesStack'], {
            'id': "rePresent-slides-stack",
            'style': {'display': 'inline'}
        })
        root.append(self.nodes['slidesStack'])

        # finally add a viewbox for scaling
        setAttributes(root, {
            'viewBox': '0 0 %s %s' % size,
            'width': '100%',
            'height': '100%'
        })

    def getChildNodes(self, node):
        u"""Get all child nodes of a node we are interested in. These are
        all slide types ('~', '+'), master layers ('!') and named
        groups ('_')
        """
        nodeStack = []
        for child in node.iterchildren(tag=NSS['svg'] + 'g'):
            if (NSS['inkscape'] + 'groupmode' in child.attrib and
                    child.attrib[NSS['inkscape'] + 'groupmode'] == 'layer' and
                    NSS['inkscape'] + 'label' in child.attrib):
                label = child.attrib[NSS['inkscape'] + 'label'].lower()
                if label.startswith('!'):
                    nodeStack.append((child, self.NODE_TYPES['master']))
                elif label.startswith('_'):
                    nodeStack.append((child, self.NODE_TYPES['ngroup']))
                elif label.startswith('~'):
                    nodeStack.append((child, self.NODE_TYPES['slide']))
                elif label.startswith('+'):
                    nodeStack.append((child, self.NODE_TYPES['part']))
                else:
                    nodeStack.append((child, self.NODE_TYPES['other']))
        return nodeStack

    def attachMasterSlide(self, masters, node):
        u"""Attach master layer(s) to a single slide layer"""
        if len(masters):
            if type(masters) is not list:
                masters = [masters]
            for master in masters:
                masterLayer = inkex.etree.Element(inkex.addNS('use'))
                setAttributes(masterLayer, {
                    NSS['xlink'] + 'href': '#' + master.get('id')
                })
                node.insert(0, masterLayer)

    def getElementCount(self, root):
        return len(root.xpath('*'))

    def addMasterSlide(self, node, globalMaster=False):
        u"""Add a master node to the local or global master slides def
        layer."""
        setStyle(node, {'display': "inline"})
        if globalMaster:
            self.nodes['masterGlobal'].append(node)
        else:
            self.nodes['masters'].append(node)

    def createNodeLink(self, node):
        u"""Creates a link element for a slide in the slides def layer."""
        nodeLink = inkex.etree.Element(inkex.addNS('use'))
        setAttributes(nodeLink, {
            'class': 'slide',
            NSS['xlink'] + 'href': '#' + node.get('id'),
        })
        return nodeLink

    def storeSlide(self, node):
        u"""Add node to the slides def layer and set needed properties."""
        setStyle(node, {'display': 'inline'})
        self.nodes['slides'].append(node)

    def addSimpleSlide(self, node):
        u"""Adds a single slide to the slides layer."""
        index = self.getElementCount(self.nodes['slidesStack']) + 1
        # store original node content
        self.storeSlide(node)

        # store link in slide order layer
        if node.get('id') is None:
            setAttributes(node, {
                'id': 'rPs_' + str(random.randint(1, 10000))
            })

        nodeLink = self.createNodeLink(node)
        setAttributes(nodeLink, {NSS['represent'] + 'index': str(index)})
        self.nodes['slidesStack'].append(nodeLink)

    def setNodeTypeAttrib(self, node, nodeType):
        u"""Set an identificational attribute to some node types. These types
        are needed for the presentation script to properly identify node
        behaviour."""
        typeStr = ''
        if (nodeType == self.NODE_TYPES['ngroup'] or
                nodeType == self.NODE_TYPES['group']):
            typeStr = 'group'
        elif nodeType == self.NODE_TYPES['part']:
            typeStr = 'part'
        elif nodeType == self.NODE_TYPES['partParent']:
            typeStr = 'partParent'
        if len(typeStr):
            setAttributes(node, {NSS['represent'] + 'type': typeStr})

    def addGroupSlide(self, node, group, nodeType=None):
        u"""Adds a slide to a slides group node."""
        # store slide
        self.storeSlide(node)
        # create link
        index = self.getElementCount(group) + 1
        nodeLink = self.createNodeLink(node)
        setAttributes(nodeLink, {NSS['represent'] + 'index': str(index)})
        self.setNodeTypeAttrib(nodeLink, nodeType)
        group.append(nodeLink)

    def filterNodes(self, nodeList, nodeType):
        nodes = []
        for node, nType in nodeList:
            if nType == nodeType:
                nodes.append(node)
        return nodes

    def createSlideGroup(self, parent=None, label=""):
        u"""Creates and adds a grouping node for slides to the slides layer."""
        if parent is not None:
            index = self.getElementCount(parent) + 1
        else:
            parent = self.nodes['slidesStack']
            index = self.getElementCount(self.nodes['slidesStack']) + 1
        gNode = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(gNode, {
            NSS['represent'] + 'index': str(index)
        })
        self.setNodeTypeAttrib(gNode, self.NODE_TYPES['group'])
        if len(label):
            setAttributes(gNode, {
                NSS['represent'] + 'label': label
            })
        parent.append(gNode)
        return gNode

    def parseSlidesGroup(self, node, nodeType):
        group = None
        # named groups may be empty (when used as bookmarks) so check
        # beforehand
        if nodeType == self.NODE_TYPES['ngroup']:
            group = self.createSlideGroup(
                label=node.get(NSS['inkscape'] + 'label'))
        else:
            group = self.createSlideGroup()

        # get children of group like nodes
        subNodes = self.getChildNodes(node)
        if len(subNodes):
            # check for local masters
            masters = self.filterNodes(subNodes,
                                       self.NODE_TYPES['master'])
            for subNode, subNodeType in subNodes:
                # skip master nodes, but move them
                if subNodeType == self.NODE_TYPES['master']:
                    self.addMasterSlide(subNode)
                    continue
                # skip non slides
                if subNodeType != self.NODE_TYPES['slide']:
                    continue

                # add local masters
                self.attachMasterSlide(masters, subNode)

                # check for parts inside subnode
                partNodes = self.filterNodes(self.getChildNodes(subNode),
                                             self.NODE_TYPES['part'])
                if len(partNodes):
                    subGroup = self.createSlideGroup(parent=group)
                    # wrap parent of the parts goup inside group
                    self.addGroupSlide(subNode, subGroup,
                                       nodeType=self.NODE_TYPES['partParent'])
                    # parts are made of subnode + previous part content
                    parts = []
                    for partNode in partNodes:
                        # add parts to group
                        self.addGroupSlide(partNode, subGroup,
                                           nodeType=self.NODE_TYPES['part'])
                        parts.append(partNode)
                else:
                    # add subnode as slide
                    self.addGroupSlide(subNode, group)

    def parseSlides(self):
        u"""Find and prepare all slides in the document."""
        # collect nodes on first tier
        rootNodes = self.getChildNodes(self.document.getroot())

        # collect root master layers in a special global master layer
        for node, nodeType in rootNodes:
            if nodeType == self.NODE_TYPES['master']:
                self.addMasterSlide(node, globalMaster=True)
            elif nodeType in (self.NODE_TYPES['slide'],
                              self.NODE_TYPES['part']):
                self.addSimpleSlide(node)
            elif nodeType in (self.NODE_TYPES['ngroup'],
                              self.NODE_TYPES['other']):
                self.parseSlidesGroup(node, nodeType)

    def addCss(self):
        u"""Insert CSS files."""
        styleNode = inkex.etree.Element(inkex.addNS('style'))
        setAttributes(styleNode, {'type': 'text/css'})

        # include all css files
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'css')
        css = ""
        # include base css first
        css += open(os.path.join(path, "rePresent.css")).read()
        # inlude all specific css
        for files in os.listdir(path):
            if files == "rePresent.css":
                continue
            elif files.endswith(".css"):
                css += open(os.path.join(path, files)).read()

        styleNode.text = css
        self.document.getroot().append(styleNode)

    def addScript(self):
        u"""Insert javascript files."""
        scriptNode = inkex.etree.Element(inkex.addNS('script', 'svg'))
        setAttributes(scriptNode, {'type': 'text/ecmascript'})

        # include all javascript files
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'js')
        script = ""
        # include base class first
        baseClass = open(os.path.join(path, "rePresent.js")).read()
        script += baseClass.replace('userConf = {};', 'userConf = %s;' %
                                    json.dumps(self.config))
        # include base files first - in order
        baseJsFiles = ['rePresent.Util.js', 'rePresent.Util.Element.js',
                       'rePresent.Util.Slide.js']
        for baseFile in baseJsFiles:
            script += open(os.path.join(path, baseFile)).read()

        # inlude all sub-classes
        jsFiles = os.listdir(path)
        # ensure right (named) order
        jsFiles.sort(key=lambda x: x.rsplit('.', 1)[0])
        for files in jsFiles:
            if (files in baseJsFiles or files == "rePresent.js" or
                    files == "main.js"):
                continue
            elif files.endswith(".js"):
                script += open(os.path.join(path, files)).read()

        # include main initialization file
        script += open(os.path.join(path, "main.js")).read()

        scriptNode.text = script
        setAttributes(scriptNode, {
            'id': "rePresent-script"
        })
        self.document.getroot().append(scriptNode)

    def getNodeText(self, node, text="", skip=False):
        u"""Iterate through child nodes collecting all text elements."""
        if node.get("style"):
            skip = True
        # iterate through all child nodes
        for textNode in (node.findall(NSS['svg'] + 'flowPara') +
                         node.findall(NSS['svg'] + 'flowSpan') +
                         node.findall(NSS['svg'] + 'tspan')):
            (newText, newSkip) = self.getNodeText(
                textNode, ''.join(textNode.xpath('./text()')), skip)
            if newSkip:
                # skip character replacement, if there are any sub-style we
                # can't handle
                skip = True
            text += newText
        return (text, skip)

    def text2path(self):
        u"""Coverts a text elements to pathes. It also tries to replace
        duplicate pathes with linked elements, where possible to reduce the
        file size. This is based on the work from Jan Thor (www.janthor.com).
        See: 'http://www.janthor.com/sketches/index.php?/archives/6-Fonts,
              -Texts,-Paths-and-Uses.html'"""
        textmap = {}
        lettermap = {}
        # gather all text nodes
        for node in self.document.getroot().xpath(
            './/*[self::svg:text or self::svg:flowRoot]',
                namespaces=inkex.NSS):
            text = ""
            spans = node.findall(NSS['svg'] + "flowPara") + node.findall(
                NSS['svg'] + "flowSpan") + node.findall(NSS['svg'] + "tspan")
            skipReplace = False
            stylesum = ""

            for span in spans:
                spanText, skipReplaceNode = self.getNodeText(span)
                if skipReplaceNode:
                    skipReplace = True
                text += spanText
                text += ''.join(span.xpath('./text()'))

                if span.get("style"):
                    # skip character replacement, if there are any sub-style we
                    # can't handle
                    skipReplace = True

            if not skipReplace and text != "":
                style = node.get("style")
                if style:
                    style = styleToDict(style)
                else:
                    style = {}

                stylesum = ";".join([style[item]
                                    for item in CSS_FONT_ATTRIBUTES
                                    if item in style])

            if text != "":
                textmap[node.get("id")] = (text.replace(
                    " ", ""), stylesum, skipReplace)

        # Convert objects to paths
        self.call_inkscape("ObjectToPath", textmap.keys())

        # replace text elements with known style attributes
        for id in textmap:
            text, stylesum, skipReplace = textmap[id]

            if skipReplace:
                continue

            group = self.document.getroot().xpath(
                ".//svg:g[@id='" + id + "']", namespaces=inkex.NSS)

            if len(group) != 1:
                continue

            group = group[0]
            paths = [p for p in group.iterdescendants(NSS['svg'] + "path")]

            if len(text) != len(paths):
                # this happens if inkscape merges two similar letters into one
                # (this happens often with 'ff')
                continue

            for i in range(len(text)):
                path = paths[i]
                m = re.search(r"[Mm] ([-0-9.]+),([-0-9.]+)", path.get("d"))
                x = float(m.group(1))
                y = float(m.group(2))
                uniq_letter = str(ord(text[i])) + "_" + stylesum

                if uniq_letter in lettermap:
                    # replace this letter with previous incarnation
                    refid, oldx, oldy = lettermap[uniq_letter]
                    u = inkex.etree.Element("use")
                    setAttributes(u, {
                        'id': path.get("id") + "-repl",
                        '{http://www.w3.org/1999/xlink}href': "#" + refid,
                        'x': "%.2f" % (x - oldx),
                        'y': "%.2f" % (y - oldy)
                    })
                    pos = group.index(path)
                    group.insert(pos, u)
                    group.remove(path)
                else:
                    # store this letter in the letter map
                    lettermap[uniq_letter] = (path.get("id"), x, y)

    def cleanSvg(self):
        # remove all font styles as they are not needed anymore
        for node in self.document.getroot().xpath('.//*[count(@style)=1]',
                                                  namespaces=inkex.NSS):
            nodeStyle = node.get("style")
            if len(nodeStyle):
                nodeStyle = styleToDict(nodeStyle)
                node.set('style', ';'.join(['%s:%s' % (attr, value) for
                        (attr, value) in nodeStyle.items() if
                    attr not in CSS_REMOVE_ATTRIBUTES]))

        # remove all unneeded inkscape/sodipodi attributes
        for element in self.document.getroot().xpath(
            ".//*[count(@inkscape:*) > 0 or count(@sodipodi:*) > 0]",
                namespaces=inkex.NSS):
            for attrName in element.keys():
                if ((attrName.startswith(NSS['inkscape']) and
                        attrName.replace(NSS['inkscape'], '') not in
                        INKSCAPE_KEEP_ATTRIBUTES) or
                        attrName.startswith(NSS['sodipodi'])):
                    del element.attrib[attrName]

    def effect(self):
        # content reordering
        self.prepareSvg()
        self.parseSlides()
        # content replacement/compression
        # self.text2path()
        # final
        self.cleanSvg()
        self.addCss()
        self.addScript()

rpDoc = RePresentDocument()
rpDoc.affect()
