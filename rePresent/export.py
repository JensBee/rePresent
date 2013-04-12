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

# Assumptions:
#  - slide do not have slide children

import random
import inkex
import inkinkex
import os
import re
import sys
_ = inkex._

NS = u"https://github.com/JensBee/rePresent"
NSS = {
    'inkscape': '{' + inkex.NSS['inkscape'] + '}',
    'sodipodi': '{' + inkex.NSS['sodipodi'] + '}',
    'svg': '{' + inkex.NSS['svg'] + '}',
    'xlink': '{' + inkex.NSS['xlink'] + '}',
    'represent': '{' + NS + '}'
}
err_file = open("/tmp/inkscape_rps_efx.txt", 'w')  # DBG

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
    NODE_TYPES = {
        'other': -1,
        'gmaster': 0,
        'master': 1,
        'ngroup': 2,
        'part': 3,
        'slide': 4
    }

    def __init__(self):
        inkinkex.InkEffect.__init__(self)
        inkex.NSS[u"represent"] = u"https://github.com/JensBee/rePresent"
        # inkex.NSS[u"represent"] = NS
        # number of master layers (really needed?)
        self.masterCount = 0
        # number of slide layers
        self.slideCount = 0
        # do we have a global master layer?
        self.hasGlobalMaster = False
        # svg group layer for all master layer
        self.mastersNode = None
        # svg group layer for all slide layer
        self.slidesNode = None
        # global master layer
        self.masterGlobal = None

    def output(self):
        u"""Write the final document."""
        self.document.write(sys.stdout)

    def prepareSvg(self):
        u"""Add some elements needed for structuring the presentation."""
        root = self.document.getroot()

        # set the background color
        # TODO: don't overwrite existing styles
        baseNode = root.xpath('//sodipodi:namedview[@id="base"]',
                              namespaces=inkex.NSS)
        if len(baseNode) and 'pagecolor' in baseNode[0].attrib:
            setStyle(root, {'background-color': baseNode[0].get('pagecolor')})
        else:
            setStyle(root, {'background-color': "#000"})

        # set size
        size = (root.get('width'), root.get('height'))
        setAttributes(root, {
            'viewBox': '0 0 %s %s' % size,
            'width': '100%',
            'height': '100%'
        })
        # add clipping path to restrict slides content to drawing area
        defs = root.xpath('//svg:defs', namespaces=inkex.NSS)
        if not len(defs):
            defNode = inkex.etree.Element(inkex.addNS('defs'))
            root.append(defNode)
            defs = [defNode]
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
        defs[0].append(clipNode)

        # all masters will be stored in one layer for later referencing
        self.mastersNode = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(self.mastersNode, {
                      'id': "rePresent-slides-masters",
                      'style': {'display': 'none'}
                      })
        root.append(self.mastersNode)
        # all slides will be stored in one layer
        self.slidesNode = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(self.slidesNode, {
            'id': "rePresent-slides",
            'style': {'display': 'none'}
        })
        root.append(self.slidesNode)
        # display order of slides is stored in a seperate layer
        self.slidesOrder = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(self.slidesOrder, {
            'id': "rePresent-slides-order",
            'style': {'display': 'inline'}
        })
        root.append(self.slidesOrder)

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

    def attachGlobalMaster(self):
        u"""Attach the global master to all slides"""
        if self.masterGlobal is not None:
            slides = self.document.xpath('//g[@id="rePresent-slides"]',
                                         namespaces=inkex.NSS)
            if len(slides):
                for slide in slides[0].iterchildren(tag=NSS['svg'] + 'g'):
                    self.attachMasterSlide(self.masterGlobal, slide)

    def moveSlide(self, node, nodeType, group=None):
        u"""Moves a slide node of a given type to the appropriate layer. Also
        links slide nodes to the slide layer and add additial metadata for
        presentation."""
        if nodeType == self.NODE_TYPES['slide']:
            # store original node content
            setStyle(node, {'display': 'inline'})
            node.append(node)
            self.slidesNode.append(node)
            # store link in slide order layer
            if node.get('id') is None:
                setAttributes(node, {
                    'id': 'rPs_' + str(random.randint(1, 10000))
                })
            nodeLink = inkex.etree.Element(inkex.addNS('use'))
            setAttributes(nodeLink, {
                'clip-path': "url(#rePresent-slide-clip)",
                NSS['xlink'] + 'href': '#' + node.get('id'),
                'style': {'display': 'none'}
            })
            if group is not None:
                group.append(nodeLink)
            else:
                self.slidesOrder.append(nodeLink)
        elif nodeType == self.NODE_TYPES['master']:
            setStyle(node, {
                'display': "inherit"
            })
            self.mastersNode.append(node)
        elif nodeType == self.NODE_TYPES['gmaster']:
            if self.masterGlobal is None:
                self.masterGlobal = inkex.etree.Element(inkex.addNS('g'))
                setAttributes(self.masterGlobal, {
                    'id': "rePresent-master-global"
                })
                self.mastersNode.append(self.masterGlobal)
            setStyle(node, {
                'display': "inherit"
            })
            self.masterGlobal.append(node)
        else:
            sys.exit(_('Cannot move slide (id:%s). Type %s is unknown.' %
                       node.get('id'), type))

    def filterNodes(self, nodeList, nodeType):
        nodes = []
        for node, nType in nodeList:
            if nType == nodeType:
                nodes.append(node)
        return nodes

    def addSlideGroup(self, label=""):
        u"""Creates and adds a grouping node for slides to the slides layer."""
        gNode = inkex.etree.Element(inkex.addNS('g'))
        setAttributes(gNode, {
            NSS['represent'] + 'type': "group"
        })
        if len(label):
            setAttributes(gNode, {
                NSS['represent'] + 'label': label
            })
        self.slidesOrder.append(gNode)
        return gNode

    def getMasterSlides(self):
        u"""Find all master slides in the document."""
        # collect nodes on first tier
        rootNodes = self.getChildNodes(self.document.getroot())

        # collect root master layers in a special global master layer
        for node, nodeType in rootNodes:
            if nodeType == self.NODE_TYPES['master']:
                self.moveSlide(node, self.NODE_TYPES['gmaster'])
            elif nodeType in (self.NODE_TYPES['slide'],
                              self.NODE_TYPES['part']):
                self.moveSlide(node, nodeType)
            elif nodeType in (self.NODE_TYPES['ngroup'],
                              self.NODE_TYPES['other']):
                # MARK
                group = None
                # named groups may be empty (when used as bookmarks) so check
                # beforehand
                if nodeType == self.NODE_TYPES['ngroup']:
                    group = self.addSlideGroup(
                        node.get(NSS['inkscape'] + 'label'))
                # get children of group like nodes
                subNodes = self.getChildNodes(node)
                if len(subNodes):
                    # check for local masters
                    masters = self.filterNodes(subNodes,
                                               self.NODE_TYPES['master'])
                    for subNode, subNodeType in subNodes:
                        # skip master nodes, but move them
                        if subNodeType == self.NODE_TYPES['master']:
                            self.moveSlide(subNode, subNodeType)
                            continue
                        # skip non slides
                        if subNodeType != self.NODE_TYPES['slide']:
                            continue
                        # add local masters
                        self.attachMasterSlide(masters, subNode)
                        # add subnode as slide
                        self.moveSlide(subNode, subNodeType, group)
                        # check for parts inside subnode
                        partNodes = self.filterNodes(
                            self.getChildNodes(subNode),
                            self.NODE_TYPES['part'])
                        # parts are made of subnode + previous part content
                        parts = []
                        for partNode in partNodes:
                            self.attachMasterSlide([subNode] + parts, partNode)
                            # TODO: mark these parts
                            self.moveSlide(partNode, subNodeType, group)
                            parts.append(partNode)

        # finally link global master to slides (lowest order)
        self.attachGlobalMaster()

    def addScript(self):
        u"""Insert the javascript."""
        # remove any old scripts
        for node in self.document.xpath('//svg:script[@id="rePresent-script"]',
                                        namespaces=inkex.NSS):
            node.getparent().remove(node)
        # add our current version
        scriptNode = inkex.etree.Element(inkex.addNS('script', 'svg'))
        scriptNode.text = open(os.path.join(
            os.path.dirname(__file__), "rePresent.js")).read()
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
            err_file.write("[" + textNode.get("id") + "] !>" +
                           newText.encode('utf8') + "<! {" +
                           str(textNode.get("style")) + "} [" +
                           str(skip) + "]\n")
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
                err_file.write("TXT[" + node.get("id") + "] >>" + text.encode(
                    'utf8') + "<< {" + stylesum + "} [" +
                    str(skipReplace) + "]\n")

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
                    err_file.write("DEL[" + node.get(
                        "id") + "] >>" + attrName.encode('utf8') + "\n")

    def effect(self):
        # content reordering
        self.prepareSvg()
        self.getMasterSlides()
        # content replacement/compression
        self.text2path()
        # final
        self.cleanSvg()
        self.addScript()
        err_file.close()

rpDoc = RePresentDocument()
rpDoc.affect()
