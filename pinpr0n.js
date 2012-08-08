/* Simply wrap everything in the onload callback function */
window.onload = function() {

	/* Search tree */

	/* Constructor */
	function Node(val, ipa) {
		this.val = val;
		this.ipa = ipa; /* phonetic representation in IPA */
		this.lo = null;
		this.eq = null;
		this.hi = null;
	}

	/* Insert a syllable (an array of characters) and its IPA representation
	 * into the tree. The special cases of inserting a prefix ("ba" after
	 * "bang") or an extension ("ning" after "ni") are both handled correctly.
	 */
	function insert(node, chars, ipa, i) {
		if (chars.length === i) {
			var n = new Node(undefined, ipa);
			if (node && node.val) { /* We are dealing with a prefix: adopt  */
				n.hi = node;        /* existing node as hi kid of new node. */
			}
			return n;
		}

		if (node === null) {
			node = new Node(chars[i], undefined);
		}

		/* The else branch also catches the condition when val is undefined.
		 * This happens when an existing key is a prefix of the new key. New
		 * nodes will be inserted in the hi kid. */
		if (chars[i] < node.val) {
			node.lo = insert(node.lo, chars, ipa, i);
		} else if (chars[i] === node.val) {
			node.eq = insert(node.eq, chars, ipa, i+1);
		} else { /* both for hi and val==undefined */
			node.hi = insert(node.hi, chars, ipa, i);
		}

		return node;
	}

	/* Searches for a syllable in the tree and returns the corresponding IPA
	 * representation, or undefined. */
	function find(node, chars, i) {
		if (node === null) {
			return undefined;
		}

		if (chars.length === i) {
			return node.ipa; /* match or undefined for incomplete syllable */
		}

		if (chars[i] < node.val) {
			return find(node.lo, chars, i);
		} else if (chars[i] === node.val) {
			return find(node.eq, chars, i+1);
		} else { /* both for hi and val==undefined */
			return find(node.hi, chars, i);
		}
	}

	/* Munches at the input array and tries to find the longest matching
	 * syllable. Returns the object { until: ..., ipa: ... }.
	 * - "until" is the index just past the longest matching sequence.
	 * - "ipa" is the IPA transcription for the syllable, or undefined if the
	 *   syllable is incomplete. */
	function munch(node, chars, i) {
		if (node === null) {
			return { until: i, ipa: undefined };
		}

		if (chars.length === i) {
			return { until: i, ipa: node.ipa }; /* node.ipa or undefined */
		}

		var m;
		if (chars[i] < node.val) {
			m = munch(node.lo, chars, i);
		} else if (chars[i] === node.val) {
			m = munch(node.eq, chars, i+1);
		} else { /* both for hi and val==undefined */
			m = munch(node.hi, chars, i);
		}

		return (m['ipa'] || !node.ipa) ? m : { until: i, ipa: node.ipa };
	}

	function createPinyinElement(parentele, type, content) {
		var ele = document.createElement('span');
		ele.className = type;
		ele.innerHTML = content;
		parentele.appendChild(ele);
	}

	/* TODO I should really break this apart ... */
	function convertAndDisplay(str) {

		var phon = document.getElementById("phonetic");
		phon.innerHTML = '';

		var curr = undefined; /* holds current key */
		var next = undefined; /* holds the next key (look-ahead) */

		var chars = str.toLowerCase().split('');
		var charsorig = str.split(''); /* keep non-lowercased string around */
		var cursor = 0;

		while (cursor !== chars.length) {

			var curr = munch(root, chars.slice(cursor), 0);

			var nextcursor = cursor + curr.until;

			if (!curr.ipa) { /* partial or no match */
				if (curr.until !== 0) { /* partial match */
					var content = charsorig.slice(cursor, nextcursor).join('');
					createPinyinElement(phon, 'incomplete', content);
				} else { /* no match, unknown character */
					var content = charsorig[cursor];
					createPinyinElement(phon, 'ignore', content);
				}
			} else { /* match */

				/* last syllable */
				if (chars[nextcursor] === undefined) {
					createPinyinElement(phon, 'pinyin', curr.ipa);
				}
				/* more to come, deal with combinatory effects */
				else {

					/* munch next sequence */
					var next = munch(root, chars.slice(nextcursor), 0);

					/* For syllables ending in "n" or "g", the correct
					 * segmentation depends on the following syllable:
					 * - "xining" -> xi-ning, not xin-*ing
					 * - "danao"  -> da-nao,  not dan-ao (Pinyin "dan'ao") */
					// TODO optimization: process two syllables in one go?

					if (chars[nextcursor-1].match(/[ng]/i)) {
						var altcurr = { until: curr.until-1, ipa: find(root, chars.slice(cursor, nextcursor-1), 0) };
						var altnext = munch(root, chars.slice(nextcursor-1), 0);
						if (altcurr.ipa && altnext.ipa && altnext.until > next.until) {
							curr = altcurr; /* use the shorter alternative */
							next = altnext;
						}
					}

					var content = curr.ipa;

					/* Treat isolated -r as erhua-r */
					if (next.until === 1 && chars[nextcursor] === 'r') {
						content += "ɻ";
						content = content.replace(/[nŋ]ɻ$/i, "\u0303ɻ");
						curr.until++;
					}

					/* Tone mark */
					var nextchar = chars[cursor+curr.until];
					if (nextchar && nextchar.match(/[1-4]/)) {
						content += tones[parseInt(nextchar)];
						curr.until++;
					}

					createPinyinElement(phon, 'pinyin', content);
				}
			}
			cursor += curr.until || 1;
		}

	}

	function showExample(event) {
		var value = event.target.value;
		var textinput = document.getElementById('textinput');
		textinput.value = value;
		convertAndDisplay(value);
	}

	function convertTextInput(event) {
		var str = event.target.value;
		convertAndDisplay(str);
	}

	/* Pinyin data */
	var syllables = {
		'ba': 'pɑ', 'pa': 'pʰɑ', 'ma': 'mɑ', 'fa': 'fɑ', 'da': 'tɑ',
		'ta': 'tʰɑ', 'na': 'nɑ', 'la': 'lɑ', 'za': 'tsɑ', 'ca': 'tsʰɑ',
		'sa': 'sɑ', 'zha': 'tʂɑ', 'cha': 'tʂʰɑ', 'sha': 'ʂɑ', 'ga': 'kɑ',
		'ka': 'kʰɑ', 'ha': 'xɑ', 'a': 'ɑ', 'bo': 'po', 'po': 'pʰo',
		'mo': 'mo', 'fo': 'fo', 'o': 'o', 'bai': 'pai', 'pai': 'pʰai',
		'mai': 'mai', 'dai': 'tai', 'tai': 'tʰai', 'nai': 'nai', 'lai': 'lai',
		'zai': 'tsai', 'cai': 'tsʰai', 'sai': 'sai', 'zhai': 'tʂai',
		'chai': 'tʂʰai', 'shai': 'ʂai', 'gai': 'kai', 'kai': 'kʰai',
		'hai': 'xai', 'ai': 'ai', 'bang': 'pɑŋ', 'pang': 'pʰɑŋ',
		'mang': 'mɑŋ', 'fang': 'fɑŋ', 'dang': 'tɑŋ', 'tang': 'tʰɑŋ',
		'nang': 'nɑŋ', 'lang': 'lɑŋ', 'zang': 'tsɑŋ', 'cang': 'tsʰɑŋ',
		'sang': 'sɑŋ', 'zhang': 'tʂɑŋ', 'chang': 'tʂʰɑŋ', 'shang': 'ʂɑŋ',
		'rang': 'ʐɑŋ', 'gang': 'kɑŋ', 'kang': 'kʰɑŋ', 'hang': 'xɑŋ',
		'ang': 'ɑŋ', 'beng': 'pəŋ', 'peng': 'pʰəŋ', 'meng': 'məŋ',
		'feng': 'fəŋ', 'deng': 'təŋ', 'teng': 'tʰəŋ', 'neng': 'nəŋ',
		'leng': 'ləŋ', 'zeng': 'tsəŋ', 'ceng': 'tsʰəŋ', 'seng': 'səŋ',
		'zheng': 'tʂəŋ', 'cheng': 'tʂʰəŋ', 'sheng': 'ʂəŋ', 'reng': 'ʐəŋ',
		'geng': 'kəŋ', 'keng': 'kʰəŋ', 'heng': 'xəŋ', 'eng': 'əŋ', 'me': 'mə',
		'de': 'tə', 'te': 'tʰə', 'ne': 'nə', 'le': 'lə', 'ze': 'tsə',
		'ce': 'tsʰə', 'se': 'sə', 'zhe': 'tʂə', 'che': 'tʂʰə', 'she': 'ʂə',
		're': 'ʐə', 'ge': 'kə', 'ke': 'kʰə', 'he': 'xə', 'e': 'ə',
		'zi': 'tsz̩', 'ci': 'tsʰz̩', 'si': 'sz̩', 'zhi': 'tʂʐ̩', 'chi': 'tʂʰʐ̩',
		'shi': 'ʂʐ̩', 'ri': 'ʐ̩', 'er': 'əɻ', 'bei': 'pɛi', 'pei': 'pʰɛi',
		'mei': 'mɛi', 'fei': 'fɛi', 'dei': 'tɛi', 'nei': 'nɛi', 'lei': 'lɛi',
		'zei': 'tsɛi', 'zhei': 'tʂɛi', 'shei': 'ʂɛi', 'gei': 'kɛi',
		'kei': 'kʰɛi', 'hei': 'xɛi', 'ei': 'ɛi', 'bao': 'pɑɔ', 'pao': 'pʰɑɔ',
		'mao': 'mɑɔ', 'dao': 'tɑɔ', 'tao': 'tʰɑɔ', 'nao': 'nɑɔ', 'lao': 'lɑɔ',
		'zao': 'tsɑɔ', 'cao': 'tsʰɑɔ', 'sao': 'sɑɔ', 'zhao': 'tʂɑɔ',
		'chao': 'tʂʰɑɔ', 'shao': 'ʂɑɔ', 'rao': 'ʐɑɔ', 'gao': 'kɑɔ',
		'kao': 'kʰɑɔ', 'hao': 'xɑɔ', 'ao': 'ɑɔ', 'pou': 'pʰou', 'mou': 'mou',
		'fou': 'fou', 'dou': 'tou', 'tou': 'tʰou', 'nou': 'nou', 'lou': 'lou',
		'zou': 'tsou', 'cou': 'tsʰou', 'sou': 'sou', 'zhou': 'tʂou',
		'chou': 'tʂʰou', 'shou': 'ʂou', 'rou': 'ʐou', 'gou': 'kou',
		'kou': 'kʰou', 'hou': 'xou', 'ou': 'ou', 'ban': 'pan', 'pan': 'pʰan',
		'man': 'man', 'fan': 'fan', 'dan': 'tan', 'tan': 'tʰan', 'nan': 'nan',
		'lan': 'lan', 'zan': 'tsan', 'can': 'tsʰan', 'san': 'san',
		'zhan': 'tʂan', 'chan': 'tʂʰan', 'shan': 'ʂan', 'ran': 'ʐan',
		'gan': 'kan', 'kan': 'kʰan', 'han': 'xan', 'an': 'an', 'ben': 'pən',
		'pen': 'pʰən', 'men': 'mən', 'fen': 'fən', 'den': 'tən', 'nen': 'nən',
		'zen': 'tsən', 'cen': 'tsʰən', 'sen': 'sən', 'zhen': 'tʂən',
		'chen': 'tʂʰən', 'shen': 'ʂən', 'ren': 'ʐən', 'gen': 'kən',
		'ken': 'kʰən', 'hen': 'xən', 'en': 'ən', 'bang': 'pɑŋ',
		'pang': 'pʰɑŋ', 'mang': 'mɑŋ', 'fang': 'fɑŋ', 'dang': 'tɑŋ',
		'tang': 'tʰɑŋ', 'nang': 'nɑŋ', 'lang': 'lɑŋ', 'zang': 'tsɑŋ',
		'cang': 'tsʰɑŋ', 'sang': 'sɑŋ', 'zhang': 'tʂɑŋ', 'chang': 'tʂʰɑŋ',
		'shang': 'ʂɑŋ', 'rang': 'ʐɑŋ', 'gang': 'kɑŋ', 'kang': 'kʰɑŋ',
		'hang': 'xɑŋ', 'ang': 'ɑŋ', 'beng': 'pəŋ', 'peng': 'pʰəŋ',
		'meng': 'məŋ', 'feng': 'fəŋ', 'deng': 'təŋ', 'teng': 'tʰəŋ',
		'neng': 'nəŋ', 'leng': 'ləŋ', 'zeng': 'tsəŋ', 'ceng': 'tsʰəŋ',
		'seng': 'səŋ', 'zheng': 'tʂəŋ', 'cheng': 'tʂʰəŋ', 'sheng': 'ʂəŋ',
		'reng': 'ʐəŋ', 'geng': 'kəŋ', 'keng': 'kʰəŋ', 'heng': 'xəŋ',
		'eng': 'əŋ', 'dong': 'toŋ', 'tong': 'tʰoŋ', 'nong': 'noŋ',
		'long': 'loŋ', 'zong': 'tsoŋ', 'cong': 'tsʰoŋ', 'song': 'soŋ',
		'zhong': 'tʂoŋ', 'chong': 'tʂʰoŋ', 'rong': 'ʐoŋ', 'gong': 'koŋ',
		'kong': 'kʰoŋ', 'hong': 'xoŋ', 'bi': 'pi', 'pi': 'pʰi', 'mi': 'mi',
		'di': 'ti', 'ti': 'tʰi', 'ni': 'ni', 'li': 'li', 'ji': 'tɕi',
		'qi': 'tɕʰi', 'xi': 'ɕi', 'yi': 'ji', 'lia': 'lia', 'jia': 'tɕia',
		'qia': 'tɕʰia', 'xia': 'ɕia', 'ya': 'ja', 'biao': 'piɑɔ',
		'piao': 'pʰiɑɔ', 'miao': 'miɑɔ', 'diao': 'tiɑɔ', 'tiao': 'tʰiɑɔ',
		'niao': 'niɑɔ', 'liao': 'liɑɔ', 'jiao': 'tɕiɑɔ', 'qiao': 'tɕʰiɑɔ',
		'xiao': 'ɕiɑɔ', 'yao': 'jɑɔ', 'bie': 'piɛ', 'pie': 'pʰiɛ',
		'mie': 'miɛ', 'die': 'tiɛ', 'tie': 'tʰiɛ', 'nie': 'niɛ', 'lie': 'liɛ',
		'jie': 'tɕiɛ', 'qie': 'tɕʰiɛ', 'xie': 'ɕiɛ', 'ye': 'jɛ', 'miu': 'miu',
		'diu': 'tiu', 'niu': 'niu', 'liu': 'liu', 'jiu': 'tɕiu',
		'qiu': 'tɕʰiu', 'xiu': 'ɕiu', 'you': 'jɔu', 'bian': 'piɛn',
		'pian': 'pʰiɛn', 'mian': 'miɛn', 'dian': 'tiɛn', 'tian': 'tʰiɛn',
		'nian': 'niɛn', 'lian': 'liɛn', 'jian': 'tɕiɛn', 'qian': 'tɕʰiɛn',
		'xian': 'ɕiɛn', 'yan': 'jɛn', 'bin': 'pɪn', 'pin': 'pʰɪn',
		'min': 'mɪn', 'nin': 'nɪn', 'lin': 'lɪn', 'jin': 'tɕɪn',
		'qin': 'tɕʰɪn', 'xin': 'ɕɪn', 'yin': 'jɪn', 'niang': 'niɑŋ',
		'liang': 'liɑŋ', 'jiang': 'tɕiɑŋ', 'qiang': 'tɕʰiɑŋ', 'xiang': 'ɕiɑŋ',
		'yang': 'jɑŋ', 'bing': 'pɪŋ', 'ping': 'pʰɪŋ', 'ming': 'mɪŋ',
		'ding': 'tɪŋ', 'ting': 'tʰɪŋ', 'ning': 'nɪŋ', 'ling': 'lɪŋ',
		'jing': 'tɕɪŋ', 'qing': 'tɕʰɪŋ', 'xing': 'ɕɪŋ', 'ying': 'jɪŋ',
		'jiong': 'tɕioŋ', 'qiong': 'tɕʰioŋ', 'xiong': 'ɕioŋ', 'yong': 'joŋ',
		'bu': 'pu', 'pu': 'pʰu', 'mu': 'mu', 'fu': 'fu', 'du': 'tu',
		'tu': 'tʰu', 'nu': 'nu', 'lu': 'lu', 'zu': 'tsu', 'cu': 'tsʰu',
		'su': 'su', 'zhu': 'tʂu', 'chu': 'tʂʰu', 'shu': 'ʂu', 'ru': 'ʐu',
		'gu': 'ku', 'ku': 'kʰu', 'hu': 'xu', 'wu': 'wu', 'zhua': 'tʂuɑ',
		'chua': 'tʂʰuɑ', 'shua': 'ʂuɑ', 'rua': 'ʐuɑ', 'gua': 'kuɑ',
		'kua': 'kʰuɑ', 'hua': 'xuɑ', 'wa': 'wɑ', 'duo': 'tuɔ', 'tuo': 'tʰuɔ',
		'nuo': 'nuɔ', 'luo': 'luɔ', 'zuo': 'tsuɔ', 'cuo': 'tsʰuɔ',
		'suo': 'suɔ', 'zhuo': 'tʂuɔ', 'chuo': 'tʂʰuɔ', 'shuo': 'ʂuɔ',
		'ruo': 'ʐuɔ', 'guo': 'kuɔ', 'kuo': 'kʰuɔ', 'huo': 'xuɔ', 'wo': 'wɔ',
		'zhuai': 'tʂuai', 'chuai': 'tʂʰuai', 'shuai': 'ʂuai', 'guai': 'kuai',
		'kuai': 'kʰuai', 'huai': 'xuai', 'wai': 'wai', 'dui': 'tui',
		'tui': 'tʰui', 'zui': 'tsui', 'cui': 'tsʰui', 'sui': 'sui',
		'zhui': 'tʂui', 'chui': 'tʂʰui', 'shui': 'ʂui', 'rui': 'ʐui',
		'gui': 'kui', 'kui': 'kʰui', 'hui': 'xui', 'wei': 'wɛi',
		'duan': 'tuan', 'tuan': 'tʰuan', 'nuan': 'nuan', 'luan': 'luan',
		'zuan': 'tsuan', 'cuan': 'tsʰuan', 'suan': 'suan', 'zhuan': 'tʂuan',
		'chuan': 'tʂʰuan', 'shuan': 'ʂuan', 'ruan': 'ʐuan', 'guan': 'kuan',
		'kuan': 'kʰuan', 'huan': 'xuan', 'wan': 'wan', 'dun': 'tun',
		'tun': 'tʰun', 'lun': 'lun', 'zun': 'tsun', 'cun': 'tsʰun',
		'sun': 'sun', 'zhun': 'tʂun', 'chun': 'tʂʰun', 'shun': 'ʂun',
		'run': 'ʐun', 'gun': 'kun', 'kun': 'kʰun', 'hun': 'xun', 'wen': 'wən',
		'zhuang': 'tʂuɑŋ', 'chuang': 'tʂʰuɑŋ', 'shuang': 'ʂuɑŋ',
		'guang': 'kuɑŋ', 'kuang': 'kʰuɑŋ', 'huang': 'xuɑŋ', 'wang': 'wɑŋ',
		'weng': 'wəŋ', 'nü': 'ny', 'lü': 'ly', 'ju': 'tɕy', 'qu': 'tɕʰy',
		'xu': 'ɕy', 'yu': 'y', 'nüe': 'nyɛ', 'lüe': 'lyɛ', 'jue': 'tɕyɛ',
		'que': 'tɕʰyɛ', 'xue': 'ɕyɛ', 'yue': 'jyɛ', 'juan': 'tɕyan',
		'quan': 'tɕʰyan', 'xuan': 'ɕyan', 'yuan': 'jyan', 'jun': 'tɕyn',
		'qun': 'tɕʰyn', 'xun': 'ɕyn', 'yun': 'jyn'
	};

	var tones = [ undefined, '˥', '˧˥', '˨˩˦', '˥˩' ];

	/* Populate the ternary search tree */
	var root = null;
	var keys = Object.keys(syllables);
	var nkeys = 0;
	for ( ; nkeys < keys.length; i++) {
		var chars = keys[nkeys].split('');
		root = insert(root, chars, syllables[keys[nkeys]], 0);
		nkeys++;
	}
	//console.log("Inserted " + nkeys + " keys into the tree");

	/* Add event listeners */
	var input = document.getElementById("textinput");
	input.addEventListener("keyup", convertTextInput, false);

	var examplebuttons = document.getElementsByClassName('examplebutton');
	for (var i = 0; i < examplebuttons.length; i++)
		examplebuttons[i].addEventListener("click", showExample, false);

};
