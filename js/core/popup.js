'use strict';

const CONTEXT = {
    WriterStories: "writer-stories",
    WriterFollowers: 'writer-followers',
    WriterFollowings: 'writer-followings',
    MeStats: 'me-stats'
}


let activeContext = CONTEXT.WriterStories;
let storiesCount = 0;


//======================================================================
// When Popup Opens , get url,  is this url is valid
// If User Click closeExtension close popup
//======================================================================
function callChromeTabsGetSelected(flag) {
    chrome.tabs.getSelected(null, tab => {
        if (flag) renderLoadingProgress(0);
        checkURLToFindAccountName(tab.url, flag);
    });
}

$(document).ready(function () {

    callChromeTabsGetSelected(false);

    $("#writerStatsMenu").click(e => {
        e.preventDefault();
        $("#left_menu").toggleClass("hide");
        activeContext = CONTEXT.WriterStories;
        callChromeTabsGetSelected(false);
    });


    $("#meStatsMenu").click(e => {
        e.preventDefault();
        $("#left_menu").toggleClass("hide");
        activeContext = CONTEXT.MeStats;
        callChromeTabsGetSelected(false)
    });


    $("#storyCount").click(e => {
        e.preventDefault();
        $(".selected-context").removeClass("selected-context");
        $("#storyCount").addClass("selected-context");
        activeContext = CONTEXT.WriterStories;
        callChromeTabsGetSelected(false);
    })


    $("#closeExtension").click(e => {
        window.close();
    })


    $("#menu").click(e => {
        e.preventDefault();
        $("#left_menu").toggleClass("hide");
    })

    $("#followersCount").click(e => {
        e.preventDefault();
        $(".selected-context").removeClass("selected-context");
        $("#followersCount").addClass("selected-context");
        activeContext = CONTEXT.WriterFollowers;
        callChromeTabsGetSelected(false);

    })

    $("#followingsCount").click(e => {
        e.preventDefault();
        $(".selected-context").removeClass("selected-context");
        $("#followingsCount").addClass("selected-context");
        activeContext = CONTEXT.WriterFollowings;
        callChromeTabsGetSelected(false);
    });


    $("#sortStories").click(e => {
        e.preventDefault();
        sortingMode = !sortingMode;
        callChromeTabsGetSelected(false);
    });

    $("#refreshData").click(e => {
        e.preventDefault();
        callChromeTabsGetSelected(true)
    });


    $('body').on("keyup", "#txtSearchStory", e => {
        e.preventDefault();
        filterStories();
    });


});

//======================================================================
// Check URL is story. If story get UserData..
//======================================================================
let selectedUser;
let sortingMode = false;

function getUser(jContent) {
    const {success, payload} = jContent
    if (success && payload && payload.references && payload.references.User) {
        const userObj = payload.references.User;
        let user = userObj[Object.keys(userObj)[0]];
        if (!user.socialStats) user.socialStats = "-"
        return user;
    }

    if (success && payload && payload.user) {
        let user = payload.user;
        user.socialStats = "-"
        return user;
    }

    return null;
}


function checkURLToFindAccountName(url, forceReload) {

    let errMsg = "This page is not medium.com story";
    let urlJSON = url + "?format=json";
    $.ajax({
        url: urlJSON,
        dataType: "text",
        type: 'GET',
        success: (html, textStatus, errorThrown) => {

            try {
                let content = html.substring(16);
                let jContent = JSON.parse(content);
                if (jContent.success && jContent.payload) {
                    const user = getUser(jContent);
                    if (user === undefined || user === null || user.socialStats === undefined) {
                        selectedUser = undefined;
                        renderError();
                    } else {
                        selectedUser = user;
                        if (activeContext === CONTEXT.MeStats) {
                            renderMeStats(user.username, forceReload);
                        } else {
                            isWriterInfoExist(user.username, forceReload);
                        }
                    }
                } else {
                    selectedUser = undefined;
                    renderError();
                }
            } catch (e) {
                renderError();
            }


        },
        error: (html, textStatus, errorThrown) => {
            selectedUser = undefined;
            $("#warningContainer").show();
        }
    });
}


//======================================================================
// Check Writers Info Persisted Background chrome.storage.local Query
//======================================================================
function isWriterInfoExist(accountName, forceReload) {

    if (forceReload) {
        checkMediumAccountAndFillModel(accountName)
    } else {
        const key = accountName + "_" + activeContext;
        chrome.runtime.sendMessage({
            op: 'isWriterInfoPersisted',
            data: {
                key: key
            }
        }, resp => {
            if (Object.keys(resp.data).length === 0) {
                checkMediumAccountAndFillModel(accountName)
            } else {
                renderWritersInfos(resp);
            }
        });

    }


}


//======================================================================
// Write User Infos to Local Storage chrome.storage.local
//======================================================================
function writeUserInfo2ChromeStorage(accountName, val) {

    const key = accountName + "_" + activeContext;
    chrome.runtime.sendMessage({
            op: 'persistWriterInfo',
            data: {
                key: key,
                val: val
            }
        }, resp => {
            if (resp != undefined && activeContext !== CONTEXT.MeStats) {
                renderWritersInfos(resp)
            } else {
                console.log(JSON.stringify(resp));
            }
        }
    )
    ;
}


//======================================================================
// Render Writer Infos
//======================================================================
function renderWritersInfos(resp) {
    $("#userInfoContainer").show();
    $("#storySearchContainer").show();
    $("#storyContainer").show();
    $("#sortStories").show();
    $("#refreshData").show();
    $("#warningContainer").hide();


    let data = resp.data;
    let strObj = data[Object.keys(data)[0]];
    let obj = JSON.parse(strObj);
    let storyTemplate = $('#story-template').html();
    let userTemplate = $('#user-template').html();
    if (sortingMode) {
        obj.storyModel.stories.sort((a, b) => {
            return b.sTotalClaps - a.sTotalClaps;
        });
    }

    let info = "";
    if (activeContext === CONTEXT.WriterStories) {
        info = Mustache.to_html(storyTemplate, obj.storyModel);
    } else if (activeContext === CONTEXT.WriterFollowers || activeContext === CONTEXT.WriterFollowings) {
        info = Mustache.to_html(userTemplate, obj.followModel);
    }


    if (selectedUser != undefined) {

        if (obj.storyModel) storiesCount = obj.storyModel.stories.length;
        let storiesCountVal = storiesCount;

        $("#avatar").attr("src", "https://cdn-images-1.medium.com/fit/c/32/32/" + selectedUser.imageId);
        $("#username").html(selectedUser.username);
        $("#followersCount").html(selectedUser.socialStats.usersFollowedByCount);
        $("#followingsCount").html(selectedUser.socialStats.usersFollowedCount);
        $("#storyCount").html(storiesCountVal + "");
        $(".banner").slideUp("default", () => {
        });
    }
    $('#storyContainer').html(info);
}


//======================================================================
// Render Progress
//======================================================================
function renderLoadingProgress(count) {
    $("#userInfoContainer").hide();
    $("#storySearchContainer").hide();
    $("#storyContainer").hide();
    $("#sortStories").hide();
    $("#refreshData").hide();

    let msg = "<h2>$LoadingCount Stories Loaded</h2>";
    if (activeContext === CONTEXT.WriterFollowers || activeContext === CONTEXT.WriterFollowings) {
        msg = "<h2>$LoadingCount Users Loaded</h2>";
    }
    $("#warningContainer").html(msg.replace("$LoadingCount", count))
    $("#warningContainer").show()
    $(".banner").show()

}


function renderError() {
    $("#warningContainer").html("<h2>This page is not medium.com story</h2>");
    $("#warningContainer").show()
}


//======================================================================
// Filter Stories For Searching
//======================================================================
function filterStories() {
    let filter = $("#txtSearchStory").val().toUpperCase();
    $(".listItem").each(el => {
        if ($(this).text().toUpperCase().indexOf(filter) > -1) {
            $(this).closest('tr').show();
        } else {
            $(this).closest('tr').hide();
        }
    });

}


//======================================================================
// Generate Model  postModel or userModel
//======================================================================
function generateModel(modelType, medium_accountname, userId) {
    if (modelType === "post") {
        let postModel = {
            storyModel: {
                stories: []
            },
            req: {
                body: {
                    medium_accountname: medium_accountname
                }
            }
        }
        postModel.storyModel.userId = userId;
        postModel.storyModel.medium_accountname = medium_accountname;
        postModel.storyModel.version = "1.0.0";
        return postModel;

    } else if (modelType === "user") {
        let userModel = {
            followModel: {
                users: []
            },
            req: {
                body: {
                    medium_accountname: medium_accountname
                }
            }
        }
        userModel.followModel.userId = userId;
        userModel.followModel.medium_accountname = medium_accountname;
        userModel.followModel.version = "1.0.0";

        return userModel;
    } else {
        return null;
    }

}


//======================================================================
// Crawling, Scraping, Fetching Stories
//======================================================================
function checkMediumAccountAndFillModel(medium_accountname) {

    let urlTemp = "https://medium.com/@$medium_account?format=json"
    let url = urlTemp.replace("$medium_account", medium_accountname);
    $.ajax({
        url: url,
        dataType: "text",
        type: 'GET',
        success: (html, textStatus, errorThrown) => {
            let content = html.substring(16);
            let jContent = JSON.parse(content);
            if (jContent.success) {
                if (activeContext === CONTEXT.WriterStories) {
                    const postModel = generateModel("post", medium_accountname, jContent.payload.user.userId);
                    findAllMediumPostAndFillModel(postModel);
                } else if (activeContext === CONTEXT.WriterFollowings) {
                    const userModel = generateModel("user", medium_accountname, jContent.payload.user.userId);
                    findAllMediumUserAndFillModel(userModel, 'following');
                } else if (activeContext === CONTEXT.WriterFollowers) {
                    const userModel = generateModel("user", medium_accountname, jContent.payload.user.userId);
                    findAllMediumUserAndFillModel(userModel, 'followers');
                }
            } else {
                //postModel.res.json({ result: false, msg: 'Invalid User Account' });
                //postModel.res.status(200).end();
            }
        },
        error: (html, textStatus, errorThrown) => {
            console.log(html);
        }
    });

}


function findAllMediumPostAndFillModel(postModel) {

    let pagingTo = postModel.pagingTo != undefined ? "&to=" + postModel.pagingTo : "";
    let urlTemp = "https://medium.com/_/api/users/$userId/profile/stream?source=latest&limit=100$pagingTo";
    let url = urlTemp.replace("$userId", postModel.storyModel.userId).replace("$pagingTo", pagingTo);
    console.log(url);
    $.ajax({
        url: url,
        dataType: "text",
        type: 'GET',
        success: (html, textStatus, errorThrown) => {

            let content = html.substring(16);
            let jContent = JSON.parse(content);
            let posts = jContent.payload.references.Post;
            if (jContent.payload.paging.next == undefined) { //Last Paging
                let accountName = postModel.req.body.medium_accountname;
                let val = JSON.stringify(postModel);
                writeUserInfo2ChromeStorage(accountName, val);
            } else {
                postModel.pagingTo = jContent.payload.paging.next.to;
                console.log(postModel.pagingTo);
                for (let pKey in posts) {
                    let pItem = posts[pKey];
                    let sUrl = "https://medium.com/p/" + pItem.uniqueSlug;
                    let sTotalClaps = pItem.virtuals.totalClapCount;

                    //Publish Date
                    let d = new Date(parseInt(pItem.latestPublishedAt)); // The 0 there is the key, which sets the date to the epoch
                    let sPublishedDate = d.toISOString().replace('-', '/').split('T')[0].replace('-', '/');

                    let existStoryIndex = -1;
                    let stories = postModel.storyModel.stories;
                    for (let i = 0; i < stories.length; i++) {
                        if (stories[i].sUrl === sUrl) {
                            existStoryIndex = i;
                            break;
                        }
                    }

                    if (existStoryIndex === -1) { //Not Exist In StoryModel
                        stories.push({
                            sTitle: pItem.title,
                            sUrl: sUrl,
                            sPublishedDate: sPublishedDate,
                            uuid: sUrl,
                            sTotalClaps: sTotalClaps,
                        });
                    } else {
                        let story = stories[existStoryIndex];
                        story.sTitle = pItem.title;
                        story.sUrl = sUrl;
                        story.sPublishedDate = sPublishedDate;
                        //uuid not updated..
                    }
                }

                //console.log("Stories Count:" + postModel.storyModel.stories.length);
                renderLoadingProgress(postModel.storyModel.stories.length);
                findAllMediumPostAndFillModel(postModel);
            }


        },
        error: function (html, textStatus, errorThrown) {
            console.log(jqXHR);
        }
    });
}


function findAllMediumUserAndFillModel(userModel, source) {
    let pagingTo = userModel.pagingTo != undefined ? "&to=" + userModel.pagingTo : "";
    let urlTemp = "https://medium.com/_/api/users/$userId/profile/stream?source=$source&limit=100$pagingTo";
    let url = urlTemp.replace("$userId", userModel.followModel.userId).replace("$pagingTo", pagingTo).replace("$source", source);
    console.log(url);

    $.ajax({
        url: url,
        dataType: "text",
        type: 'GET',
        success: (html, textStatus, errorThrown) => {

            let content = html.substring(16);
            let jContent = JSON.parse(content);
            let followerUsers = jContent.payload.references.User;
            if (jContent.payload.paging.next == undefined || jContent.payload.paging.next.to === undefined) { //Last Paging
                let accountName = userModel.req.body.medium_accountname;
                let val = JSON.stringify(userModel);
                writeUserInfo2ChromeStorage(accountName, val);
            } else {
                userModel.pagingTo = jContent.payload.paging.next.to;
                console.log(userModel.pagingTo);
                for (let uKey in followerUsers) {
                    let uItem = followerUsers[uKey];
                    let uUrl = "https://medium.com/@" + uItem.username; //Change To User Ul

                    //Publish Date
                    let d = new Date(parseInt(uItem.createdAt)); // The 0 there is the key, which sets the date to the epoch
                    let uCreatedAtDate = d.toISOString().replace('-', '/').split('T')[0].replace('-', '/');

                    let existFollowerIndex = -1;
                    let users = userModel.followModel.users;
                    for (let i = 0; i < users.length; i++) {
                        if (users[i].uUrl === uUrl) {
                            existFollowerIndex = i;
                            break;
                        }
                    }

                    if (existFollowerIndex === -1) { //Not Exist In followModel
                        users.push({
                            uUrl: uUrl,
                            uCreatedAtDate: uCreatedAtDate,
                            uuid: uUrl,
                            uName: uItem.name,
                            uUserName: uItem.username,
                            uBio: uItem.bio,
                        });
                    } else {
                        let user = users[existFollowerIndex];
                        user.uUrl = uUrl;
                        user.uCreatedAtDate = uCreatedAtDate;
                        user.uName = uItem.name;
                        user.uUserName = uItem.username,
                            user.uBio = uItem.bio
                        //uuid not updated..
                    }
                }

                //console.log("Stories Count:" + postModel.storyModel.stories.length);
                renderLoadingProgress(userModel.followModel.users.length);
                findAllMediumUserAndFillModel(userModel, source);
            }


        },
        error: (html, textStatus, errorThrown) => {
            console.log(jqXHR);
        }
    });
}


//======================================================================
// Render Me Stats Infos
//======================================================================
function renderMeStats(accountName) {
    $("#userInfoContainer").hide();
    $("#storySearchContainer").hide();
    $("#storyContainer").hide();
    $("#sortStories").hide();
    $("#refreshData").hide();
    $("#warningContainer").hide();
    isMeStatsExist(accountName)
}


function isMeStatsExist(accountName, override) {

    const key = accountName + "_" + activeContext;
    chrome.runtime.sendMessage({
        op: 'isWriterInfoPersisted',
        data: {
            key: key
        }
    }, resp => {
        const postModel = generateModel("post", accountName, -1);
        if (Object.keys(resp.data).length === 0) {
            findAllMediumPostAndFillStats(postModel, null, true);
        } else {
            let data = resp.data;
            let strObj = data[Object.keys(data)[0]];
            let oldModel = JSON.parse(strObj);
            findAllMediumPostAndFillStats(postModel, oldModel, override);
        }
    });

}


//============================================================================================
//https://medium.com/@{username}/stats?filter=not-response
//==============================================================================================
function findAllMediumPostAndFillStats(postModel, oldModel, override) {

    let pagingTo = postModel.pagingTo != undefined ? "&to=" + postModel.pagingTo : "";
    let urlTemp = "https://medium.com/@odayibasi/stats?limit=25$pagingTo&filter=not-response&bucketType=MONTH&format=json";
    if (pagingTo === "") {
        urlTemp = "https://medium.com/@odayibasi/stats?filter=not-response&format=json";
    }
    let url = urlTemp.replace("$accountName", postModel.req.body.medium_accountname).replace("$pagingTo", pagingTo);
    $.ajax({
        url: url,
        dataType: "text",
        type: 'GET',
        success: (html, textStatus, errorThrown) => {

            let content = html.substring(16);
            let jContent = JSON.parse(content);
            let posts = jContent.payload.value;
            if (jContent.payload.paging.next == undefined) { //Last Paging
                let accountName = postModel.req.body.medium_accountname;
                let val = JSON.stringify(postModel);
                calculateDiffAndRender(postModel, oldModel === null ? postModel : oldModel);
                
                if (override) {
                    writeUserInfo2ChromeStorage(accountName, val);
                }
            } else {
                postModel.pagingTo = jContent.payload.paging.next.to;
                let stories = postModel.storyModel.stories;
                postModel.storyModel.stories = stories.concat(posts);
                renderLoadingProgress(postModel.storyModel.stories.length);
                findAllMediumPostAndFillStats(postModel, oldModel, override);
            }


        },
        error: (html, textStatus, errorThrown) => {
            console.log(jqXHR);
        }
    });
}


function calculateDiffAndRender(postModel, oldModel) {
    let currentStories = postModel.storyModel.stories;
    let oldStories = oldModel.storyModel.stories;
    const currentStoryMap = {};
    const oldStoryMap = {};
    currentStories.forEach(el => currentStoryMap[el.postId] = el);
    oldStories.forEach(el => oldStoryMap[el.postId] = el);

    const storiesDiffArr = [];
    for (let key in currentStoryMap) {
        const currStory = currentStoryMap[key];
        const oldStory = oldStoryMap[key];

        //Publish
        let d = new Date(parseInt(currStory.firstPublishedAt)); // The 0 there is the key, which sets the date to the epoch
        const uCreatedAtDate = d.toISOString().replace('-', '/').split('T')[0].replace('-', '/');

        const storyDiffObj = {
            postId: key,
            sTitle: currStory.title,
            sDiff: currStory.views,
            sPublishedDate: uCreatedAtDate,
        }

        if (oldStory) {
            storyDiffObj.sDiff = storyDiffObj.sDiff - oldStory.views;
        }
        storiesDiffArr.push(storyDiffObj);
    }

    storiesDiffArr.sort((a, b) => {
        return b.sDiff - a.sDiff;
    });


    $("#userInfoContainer").show();
    $("#storySearchContainer").show();
    $("#storyContainer").show();
    $("#sortStories").show();
    $("#refreshData").show();
    $("#warningContainer").hide();

    let storyDiffTemplate = $('#story-diff-template').html();
    let info = Mustache.to_html(storyDiffTemplate, {stories: storiesDiffArr});

    if (selectedUser != undefined) {

        let storiesCountVal = storiesDiffArr.length;

        $("#avatar").attr("src", "https://cdn-images-1.medium.com/fit/c/32/32/" + selectedUser.imageId);
        $("#username").html(selectedUser.username);
        $("#followersCount").html(selectedUser.socialStats.usersFollowedByCount);
        $("#followingsCount").html(selectedUser.socialStats.usersFollowedCount);
        $("#storyCount").html(storiesCountVal + "");
        $(".banner").slideUp("default", () => {
        });
    }
    $('#storyContainer').html(info);

}
