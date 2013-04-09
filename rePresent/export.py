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

# This is heavyly based on the work from Jan Thor (www.janthor.com).
# See: http://www.janthor.com/sketches/index.php?/archives/6-Fonts,-Texts,-Paths-and-Uses.html

import sys
# Unix
sys.path.append('/usr/share/inkscape/extensions')
# OS X
sys.path.append('/Applications/Inkscape.app/Contents/Resources/extensions')
# Windows
sys.path.append('C:\Program Files\Inkscape\share\extensions')
import inkex
import inkinkex
import re

S = "{http://www.w3.org/2000/svg}"
nsmap = {u"svg":u"http://www.w3.org/2000/svg"}

class RePresentOutput(inkinkex.InkEffect):
	textmap = {} # id, (text, style)
	
	def output(self):
		self.document.write(sys.stdout)

	def getNodeText(self, node, text=""):
		# iterate through all child nodes
		for textNode in (node.findall(S+'flowPara') + node.findall(S+'flowSpan')):
			text += self.getNodeText(textNode, ''.join(textNode.xpath('./text()')))
		return text

	def effect(self):		
		lettermap = {}
		
		# gather all text nodes
		for node in self.document.getroot().xpath('.//*[self::svg:text or self::svg:flowRoot]', namespaces=nsmap):
			text = ""
			spans = node.findall(S+"tspan") + node.findall(S+"flowPara")
			
			for span in spans:
				spanTextIterative = self.getNodeText(span)
				
				if spanTextIterative != "":
					text += spanTextIterative
					
				spanTextDirect = ' '.join(span.xpath('./text()'))
				
				if spanTextDirect != "":
					text += spanTextDirect
					
			if text != "":
				style = node.get("style")
				
				if style:
					style = dict([i.split(":") for i in style.split(";") if len(i)])
				else:
					style = {}
					
				stylesum = ";".join([style[item] for item in ["font-family", "font-size", "font-stretch", "font-style", "font-variant", "font-weight"] if item in style])
				RePresentOutput.textmap[node.get("id")] = (text.replace(" ", ""), stylesum)
							
		# Convert objects to paths
		self.call_inkscape("ObjectToPath", RePresentOutput.textmap.keys())
		# TODO:  cool, but too error-prone
		# Replace paths with uses
		#~ for id in RePresentOutput.textmap:
			#~ text, stylesum = RePresentOutput.textmap[id]
			#~ group = self.document.getroot().xpath(".//svg:g[@id='"+id+"']", namespaces=nsmap)
			#~ if len(group) != 1:
				#~ continue
			#~ group = group[0]
			#~ paths = [p for p in group.iterdescendants(S+"path")]
			#~ if len(text) != len(paths):
				#~ # this happens if inkscape merges two similar letters into one (this happens often with 'ff')
				#~ continue
			#~ for i in range(len(text)):
				#~ path = paths[i]
				#~ m = re.search(r"[Mm] ([-0-9.]+),([-0-9.]+)", path.get("d"))
				#~ x = float(m.group(1))
				#~ y = float(m.group(2))
				#~ uniq_letter = str(ord(text[i])) + "_" + stylesum
				#~ if uniq_letter in lettermap:
					#~ # replace this letter with previous incarnation
					#~ refid, oldx, oldy = lettermap[uniq_letter]
					#~ u = inkex.etree.Element("use")
					#~ u.set("id", path.get("id") + "-repl")
					#~ u.set("{http://www.w3.org/1999/xlink}href", "#" + refid)
					#~ u.set("x", "%.2f" % (x - oldx))
					#~ u.set("y", "%.2f" % (y - oldy))
					#~ pos = group.index(path)
					#~ group.insert(pos, u)
					#~ group.remove(path)
				#~ else:
					#~ # store this letter in the letter map
					#~ lettermap[uniq_letter] = (path.get("id"), x, y)

if __name__ == '__main__': RePresentOutput().affect()
