var R = require('ramda');
var pinyin = require('pinyin');

function containsUpperCase(str) {
    return str.toLowerCase() != str;
}

function containsChinese(str){
    if(/.*[\u4e00-\u9fa5]+.*$/.test(str)) {
        return true;
    }
    return false;
}

function isChineseChar(char) {
    var charCode = char.charCodeAt(0);
    if (charCode <= 0x9fa5 && charCode >= 0x4e00) {
        return true;
    }
    return false;
}

function convertChineseCharToPinyin(chineseChar){
    return pinyin(chineseChar, {heteronym: true, style: pinyin.STYLE_NORMAL});
}

function convertStrToPinyin(chineseStr, delimiter) {
    var resultsArr = [];
    if (delimiter === undefined){
        delimiter = '';
    }
    convertStrToPinyinRecursive(chineseStr, '', resultsArr, delimiter);
    return resultsArr;
}

function convertStrToPinyinRecursive(chineseStr, partialResult, resultsArr, delimiter) {
    if (delimiter === undefined){
        delimiter = '';
    }
    if (!chineseStr){
        resultsArr.push(partialResult);
        return;
    }
    var pinyinStr = partialResult;
    var  char = chineseStr.charAt(0);
    if (isChineseChar(char)) {
        //convert to pinyin
        let pinyins = pinyin(char, {heteronym: true, style: pinyin.STYLE_NORMAL})[0];
        for (let pinyin of pinyins ) {
            var capitalPinyin = delimiter + pinyin.charAt(0).toUpperCase() + pinyin.substring(1) + delimiter;
            convertStrToPinyinRecursive(chineseStr.substring(1), partialResult+capitalPinyin, resultsArr, delimiter)
        }
    } else {
        pinyinStr = pinyinStr + char;
        convertStrToPinyinRecursive(chineseStr.substring(1), partialResult+char, resultsArr, delimiter);
    }
}

function addMarkups(pattern, testStr) {
    var originalStr = testStr;
    var delimiter = "中"
    var testStrsArr = convertStrToPinyin(testStr, delimiter);
    var resultsArr = []
    //for (let testStr of testStrsArr) {
    testStr = testStrsArr[0];
        addMarkupsRecursive(pattern, testStr.trim(), '', resultsArr, containsUpperCase(pattern));
    //}
    var splitedOriginalStr = splitByChineseChar(originalStr.trim());
    var splitedResultsArr = R.map((result)=> R.filter((ele)=>ele, result.split(delimiter)), resultsArr);
    var markedResultArr = []

    for (let splitedResult of splitedResultsArr) {
        if (splitedOriginalStr.length == splitedResult.length) {
            var validPinyinMark = true;
            for (let j = 0; j < splitedOriginalStr.length; j ++) {
                //some pinyin marks are not valid for pinyin, so just ignore them
                let hasChineseChar = containsChinese(splitedOriginalStr[j]);
                let hasMark = splitedResult[j].indexOf('<mark>')>=0;
                if (hasChineseChar &&
                    splitedResult[j].indexOf('<mark>')===0 &&
                    (splitedResult[j].match(/<mark>/g)||[]).length === ((splitedResult[j].match(/<\/mark><mark>/g) || []).length+1)) {
                    splitedResult[j]  = '<mark>' + splitedOriginalStr[j] + '</mark>';
                } else if (hasChineseChar && hasMark) {
                    validPinyinMark = false;
                    break;
                }else if (hasChineseChar) {
                    splitedResult[j]  = splitedOriginalStr[j];
                }
            }
            if (validPinyinMark) {
                markedResultArr.push(splitedResult.join(''));
            }
        }
    }

    var mergedResultList = R.map((res) => res.replace(/<\/mark><mark>/g, ''), markedResultArr);
    var numOfMarksCount = R.map(countMarkTag, mergedResultList);
    if (mergedResultList.length > 0) {
        return mergedResultList[findMinIndex(numOfMarksCount)];
    } else {
        return [];
    }
}

function countMarkTag(str) {
    if (str)
        return (str.match(/<mark>/g)||[]).length;
    else
        return 0;
}

function findMinIndex(arr) {
    var minIndex = 0;
    for (let i = 0; i < arr.length; i++){
        if (arr[i]< arr[minIndex]) {
            minIndex = i;
        }
    }
    return minIndex;
}

function addMarkupsRecursive(pattern, testStr, partialRes, resultList, caseSensitive) {
    if (pattern.length === 0) {
        //base case, find a solution
        resultList.push(partialRes + testStr);
        return;
    }
    var remaining = caseSensitive ? testStr : testStr.toLowerCase();
    var remainingOriginal  = testStr;
    while(remaining.length >= pattern.length) {
        var pos = remaining.indexOf(pattern.charAt(0));
        if (pos <= -1) {
            return;        //not a potential solution
        }
        //add/mark the result to partial res and go ahead (recursive call)
        var newPartialRes = partialRes + remainingOriginal.substring(0,pos) +
            '<mark>' + remainingOriginal.charAt(pos) + '</mark>';
        addMarkupsRecursive(pattern.substring(1), remainingOriginal.substring(pos + 1), newPartialRes, resultList, caseSensitive);
        //ignore the result, move remaining to a new position, move partialRes to a new position
        partialRes = partialRes + remainingOriginal.substring(0, pos + 1)
        remaining = remaining.substring(pos+1);
        remainingOriginal = remainingOriginal.substring(pos+1);
    }
    return;
}

function splitByChineseChar(str){
    var resultArr = [];
    var prevChars = '';
    for (let char of str) {
        if (isChineseChar(char)) {
            if (prevChars) {
                resultArr.push(prevChars)
                prevChars='';
            }
            resultArr.push(char)
        } else {
            prevChars = prevChars + char;
        }
    }
    if (prevChars) {
        resultArr.push(prevChars)
    }
    return resultArr;
}

module.exports = {
    convertChineseCharToPinyin: convertChineseCharToPinyin,
    containsChinese: containsChinese,
    convertStrToPinyin: convertStrToPinyin,
    addMarkups: addMarkups,
}
