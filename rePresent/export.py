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

S = '{' + inkex.NSS['svg'] + '}'
err_file = open("/tmp/inkscape_rps_efx.txt" , "w") # DBG

CSS_FONT_ATTRIBUTES = ["-inkscape-font-specification",
					   "font-family",
					   "font-size", "font-stretch",
					   "font-style", "font-variant", "font-weight"]
CSS_REMOVE_ATTRIBUTES = ["line-height"] + CSS_FONT_ATTRIBUTES
INKSCAPE_KEEP_ATTRIBUTES = ["groupmode", "label"]

class RePresentOutput(inkinkex.InkEffect):
	def output(self):
		self.document.write(sys.stdout)

	def addScript(self):
		u"""Insert the javascript"""
		# remove any old scripts
		for node in self.document.xpath("//svg:script[@id='rePresent']", namespaces=inkex.NSS):
			node.getparent().remove(node)
		# add our current version
		scriptElm = inkex.etree.Element(inkex.addNS("script", "svg"))
		scriptElm.text = open(os.path.join(os.path.dirname(__file__), "rePresent.js")).read()
		scriptElm.set("id", "rePresent")
		self.document.getroot().append(scriptElm)

	def getNodeText(self, node, text="", skip=False):
		u"""Iterate through child nodes collecting all text elements."""
		if node.get("style"):
			skip = True
		# iterate through all child nodes
		for textNode in (node.findall(S+'flowPara') + node.findall(S+'flowSpan') + node.findall(S+'tspan')):			
			(newText, newSkip) = self.getNodeText(textNode, ''.join(textNode.xpath('./text()')), skip)
			if newSkip:
				# skip character replacement, if there are any sub-style we can't handle
				skip = True
			err_file.write("["+textNode.get("id")+"] !>"+newText.encode('utf8')+"<! {"+str(textNode.get("style"))+"} ["+str(skip)+"]\n")
			text += newText
		return (text, skip)
		
	def text2path(self):	
		u"""Coverts a text elements to pathes. It also tries to replace duplicate pathes with linked elements, where possible to reduce the file size.
		This is based on the work from Jan Thor (www.janthor.com).
		See: http://www.janthor.com/sketches/index.php?/archives/6-Fonts,-Texts,-Paths-and-Uses.html"""
		textmap = {}
		lettermap = {}
		pathMap = {}
		# gather all text nodes
		for node in self.document.getroot().xpath('.//*[self::svg:text or self::svg:flowRoot]', namespaces=inkex.NSS):
			text = ""
			spans = node.findall(S+"flowPara") + node.findall(S+"flowSpan") + node.findall(S+"tspan")
			skipReplace = False
			stylesum = ""
			
			for span in spans:
				spanText, skipReplaceNode = self.getNodeText(span)
				if skipReplaceNode:
					skipReplace = True
				text += spanText
				text += ''.join(span.xpath('./text()'))
				
				if span.get("style"):
					# skip character replacement, if there are any sub-style we can't handle
					skipReplace = True
					
			if not skipReplace and text != "":
				style = node.get("style")
				if style:
					style = dict([i.split(":") for i in style.split(";") if len(i)])
				else:
					style = {}
					
				stylesum = ";".join([style[item] for item in CSS_FONT_ATTRIBUTES if item in style])
				
			if text != "":
				textmap[node.get("id")] = (text.replace(" ", ""), stylesum, skipReplace)
				err_file.write("["+node.get("id")+"] >>"+text.encode('utf8')+"<< {"+stylesum+"} ["+str(skipReplace)+"]\n")
				
		# Convert objects to paths
		self.call_inkscape("ObjectToPath", textmap.keys())
		
		# replace text elements with known style attributes
		for id in textmap:
			text, stylesum, skipReplace = textmap[id]
			
			if skipReplace:
				continue
				
			group = self.document.getroot().xpath(".//svg:g[@id='"+id+"']", namespaces=inkex.NSS)
			
			if len(group) != 1:
				continue
				
			group = group[0]
			paths = [p for p in group.iterdescendants(S+"path")]
			
			if len(text) != len(paths):
				# this happens if inkscape merges two similar letters into one (this happens often with 'ff')
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
					
		# remove all font styles as they are not needed anymore
		for node in self.document.getroot().xpath(".//*[count(@style)=1]", namespaces=inkex.NSS):
			nodeStyle = node.get("style")
			if len(nodeStyle):
				nodeStyle = dict([i.split(":") for i in nodeStyle.split(";") if len(i)])				
				node.set('style', ';'.join(['%s:%s' % (attr, value) for (attr, value) in nodeStyle.items() if attr not in CSS_REMOVE_ATTRIBUTES]))
		
		# remove all unneeded inkscape attributes
		inkscapeNS = '{' + inkex.NSS['inkscape'] + '}'
		for element in self.document.getroot().xpath(".//*[count(@inkscape:*) > 0]", namespaces=inkex.NSS):
				for attr in element.attrib.items():
					name, value = attr
					if name.startswith(inkscapeNS) and name.replace(inkscapeNS, '') not in INKSCAPE_KEEP_ATTRIBUTES:
						del element.attrib[name]
		 				err_file.write("DEL["+node.get("id")+"] >>"+ name.encode('utf8') + ':' + value.encode('utf8') +"\n")

		# remove all sodipodi attributes
		for element in self.document.getroot().xpath(".//*[count(@sodipodi:*) > 0]", namespaces=inkex.NSS):
				for attr in element.attrib.items():
					name, value = attr
					if name.startswith('{' + inkex.NSS['sodipodi'] + '}'):
						del element.attrib[name]
		 				err_file.write("DEL["+node.get("id")+"] >>"+ name.encode('utf8') + ':' + value.encode('utf8') +"\n")
		
		err_file.close() # DBG
		
	def effect(self):
		self.text2path()
		self.addScript()

if __name__ == '__main__': RePresentOutput().affect()
