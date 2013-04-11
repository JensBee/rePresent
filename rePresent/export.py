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

import inkex
import inkinkex
import os
import re
import sys
_ = gettext.gettext

NSS = {
    'inkscape': '{' + inkex.NSS['inkscape'] + '}',
    'sodipodi': '{' + inkex.NSS['sodipodi'] + '}',
    'svg': '{' + inkex.NSS['svg'] + '}',
    'xlink': '{' + inkex.NSS['xlink'] + '}'
}
err_file = open("/tmp/inkscape_rps_efx.txt", 'w')  # DBG

CSS_FONT_ATTRIBUTES = ['-inkscape-font-specification',
                       'font-family',
                       'font-size', 'font-stretch',
                       'font-style', 'font-variant', 'font-weight']
CSS_REMOVE_ATTRIBUTES = ['line-height'] + CSS_FONT_ATTRIBUTES
INKSCAPE_KEEP_ATTRIBUTES = ['groupmode', 'label']


class RePresentDocument(inkinkex.InkEffect):
    def __init__(self):
        inkinkex.InkEffect.__init__(self)
        #inkex.NSS[u"represent"] = u"https://github.com/JensBee/rePresent"
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
        #self.document.write(sys.stdout)
        sys.stdout.write(inkex.etree.tostring(self.document,
                                              pretty_print=True))

    def prepareSvg(self):
        u"""Add some elements needed for structuring the presentation."""
        # all masters will be stored in one layer for later referencing
        self.mastersNode = inkex.etree.Element(inkex.addNS('g'))
        self.mastersNode.set("id", "rePresent-slides-masters")
        self.mastersNode.set("style", "display:none")
        self.document.getroot().append(self.mastersNode)
        # all slides will be stored in one layer
        self.slidesNode = inkex.etree.Element(inkex.addNS('g'))
        self.slidesNode.set("id", "rePresent-slides")
        self.slidesNode.set("style", "display:inherit")
        self.document.getroot().append(self.slidesNode)

    def getChildSlides(self, node):
        master = []  # nodes that are master layers
        slides = []  # nodes that are slides
        stack = []  # other layers
        for child in node.iterchildren(tag=NSS['svg']+'g'):
            if (NSS['inkscape']+'groupmode' in child.attrib and
                    child.attrib[NSS['inkscape']+'groupmode'] == 'layer'):
                if NSS['inkscape']+'label' in child.attrib:
                    label = child.attrib[NSS['inkscape'] + 'label'].lower()
                    if "{master}" in label:
                        master.append(child)
                    elif label.startswith('~'):
                        slides.append(child)
                else:
                    stack.append(child)
        return (master, slides, stack)

    def attachMasterSlide(self, master, node):
        u"""Attach a master layer to a single slide layer"""
        masterLayer = inkex.etree.Element(inkex.addNS('use'))
        masterLayer.set(NSS['xlink']+'href', '#'+master.get('id'))
        node.insert(0, masterLayer)

    def attachGlobalMaster(self):
        u"""Attach the global master to all slides"""
        slides = self.document.xpath('//g[@id="rePresent-slides"]',
                                     namespaces=inkex.NSS)
        if self.masterGlobal is not None and len(slides):
            for slide in slides[0].iterchildren(tag=NSS['svg']+'g'):
                err_file.write("MST[" + slide.get("id") + "] attached\n")
                self.attachMasterSlide(self.masterGlobal, slide)
        else:
            err_file.write("MST NONE\n")

    def moveSlide(self, node, type):
        u"""Moves a slide node of a given type to the appropriate layer"""
        if type == 'slide':
            self.slidesNode.append(node)
        elif type == 'master':
            self.mastersNode.append(node)
        elif type == 'gmaster':
            if self.masterGlobal is None:
                self.masterGlobal = inkex.etree.Element(inkex.addNS('g'))
                self.masterGlobal.set("id", "rePresent-master-global")
                self.mastersNode.append(self.masterGlobal)
            self.masterGlobal.append(node)
        else:
            sys.exit(_('Cannot move slide (id:%s). Type %s is unknown.' %
                       node.get('id'), type))

    def getMasterSlides(self):
        u"""Find all master slides in the document."""
        err_file.write("--MASTER-SLIDES--\n")

        # get root master and slide layers
        masters, slides, stack = self.getChildSlides(self.document.getroot())

        # collect root master layers in a special global master layer
        if len(masters):
            for master in masters:
                self.moveSlide(master, 'gmaster')

        # move slides (this must be iterative)
        if len(slides):
            for slide in stack:
                self.slideCount += 1
                slide.set('id', 'rePresent-slide-'+str(self.slideCount))
                self.slidesNode.append(slide)

        # for action, element in inkex.etree.iterwalk(self.document.getroot(),
        #                                             events=('start', 'end')):
        #     if action == 'start' and element.tag == (NSS['svg']+'g'):
        #         stack.append(element)
        # push all masters and slides to specific layers
        # for element in stack:
        #     if (NSS['inkscape']+'label' in element.attrib and
        #             "{master}" in element.attrib[NSS['inkscape'] +
        #             'label'].lower()):
        #         self.masterCount += 1
        #         element.set('id', 'rePresent_master_'+str(self.masterCount))
        #         self.mastersNode.append(element)
        #     else:
        #         self.slideCount += 1
        #         element.set('id', 'rePresent_slide_'+str(self.slideCount))
        #         self.slidesNode.append(element)
        # DBG

        # finally link global master to slides
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
        scriptNode.set('id', "rePresent-script")
        self.document.getroot().append(scriptNode)

    def getNodeText(self, node, text="", skip=False):
        u"""Iterate through child nodes collecting all text elements."""
        if node.get("style"):
            skip = True
        # iterate through all child nodes
        for textNode in (node.findall(NSS['svg']+'flowPara') +
                         node.findall(NSS['svg']+'flowSpan') +
                         node.findall(NSS['svg']+'tspan')):
            (newText, newSkip) = self.getNodeText(
                textNode, ''.join(textNode.xpath('./text()')), skip)
            if newSkip:
                # skip character replacement, if there are any sub-style we
                # can't handle
                skip = True
            err_file.write("[" + textNode.get("id") + "] !>" +
                           newText.encode('utf8') + "<! {" +
                           str(textNode.get("style"))+"} ["+str(skip)+"]\n")
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
            spans = node.findall(NSS['svg']+"flowPara") + node.findall(
                NSS['svg']+"flowSpan") + node.findall(NSS['svg']+"tspan")
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
                    style = dict([i.split(
                        ":") for i in style.split(";") if len(i)])
                else:
                    style = {}

                stylesum = ";".join([style[item]
                                    for item in CSS_FONT_ATTRIBUTES
                                    if item in style])

            if text != "":
                textmap[node.get("id")] = (text.replace(
                    " ", ""), stylesum, skipReplace)
                err_file.write("TXT["+node.get("id")+"] >>"+text.encode(
                    'utf8')+"<< {"+stylesum+"} ["+str(skipReplace)+"]\n")

        # Convert objects to paths
        self.call_inkscape("ObjectToPath", textmap.keys())

        # replace text elements with known style attributes
        for id in textmap:
            text, stylesum, skipReplace = textmap[id]

            if skipReplace:
                continue

            group = self.document.getroot().xpath(
                ".//svg:g[@id='"+id+"']", namespaces=inkex.NSS)

            if len(group) != 1:
                continue

            group = group[0]
            paths = [p for p in group.iterdescendants(NSS['svg']+"path")]

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
                    u.set("id", path.get("id") + "-repl")
                    u.set("{http://www.w3.org/1999/xlink}href", "#" + refid)
                    u.set("x", "%.2f" % (x - oldx))
                    u.set("y", "%.2f" % (y - oldy))
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
                nodeStyle = (dict([i.split(":")
                             for i in nodeStyle.split(";") if len(i)]))
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
                    err_file.write("DEL["+node.get(
                        "id")+"] >>" + attrName.encode('utf8') + "\n")

    def effect(self):
        # content reordering
        self.prepareSvg()
        self.getMasterSlides()
        # content replacement/compression
        self.text2path()
        # final
        self.cleanSvg()
        # self.addScript()
        err_file.close()

rpDoc = RePresentDocument()
rpDoc.affect()
