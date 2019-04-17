
const { ActivityTypes, CardFactory } = require('botbuilder');
const { NumberPrompt, DialogSet, WaterfallDialog } = require('botbuilder-dialogs');
const _ = require('lodash');

const flickr = require('./flickr');

const DIALOG_STATE_PROPERTY = 'dialogState';

const SHOW_PICTURES = 'show_pictures';
const NUM_OF_PICTURES = 'number_of_pictures';

class FlickrBot {
    /**
     *
     * @param {Object} conversationState
     * @param {Object} userState
     */
    constructor(conversationState, userState) {
        // creates a new state accessor property.
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);

        this.dialogs = new DialogSet(this.dialogState);

        this.dialogs.add(new NumberPrompt(NUM_OF_PICTURES, async (prompt) => {
            if (prompt.recognized.succeeded) {
                if (prompt.recognized.value === 0 || prompt.recognized.value > 100) {
                    await prompt.context.sendActivity(`Please select a valid value, 1 to 100`);
                    return false;
                } else {
                    return true;
                }
            }

            return false;
        }));

        // Create a dialog that asks the user for their name.
        this.dialogs.add(new WaterfallDialog(SHOW_PICTURES, [
            this.promptForPicCount.bind(this),
            this.displayPhotos.bind(this)
        ]));

    }

    async promptForPicCount(step) {
        return await step.prompt(NUM_OF_PICTURES, `How many pictures should i fetch (1 to 100)?`);
    }

    async displayPhotos(step) {
        const cards = await this.getPhotos(step.result);
        await step.context.sendActivity({ attachments: cards });
        return await step.next();
    }

    /**
     * pull photos from the flickr api
     *
     * @param {number} numOfPhotos - number of photos to pull
     * @returns {Promise<Array>}
     */
    async getPhotos(numOfPhotos) {
        let photos;
        let cards;

        try {
            photos = await flickr.getRandomPhotos(numOfPhotos);
            cards = _.map(photos, photo => this.createCardFromPhoto(photo));
        } catch (err) {
            console.log(err);
            throw err;
        }

        return cards;
    }

    /**
     * create a crad object from a photo object
     *
     * @param {object} photoObj - a photo object as returned from the flickr module
     * @returns {Attachment}
     */
    createCardFromPhoto(photoObj) {
        return CardFactory.heroCard(
            photoObj.title,
            `Autor: ${photoObj.ownerName} \n Date taken: ${photoObj.dateTaken}`,
            CardFactory.images([photoObj.url_c]),
            CardFactory.actions([
                {
                    type: 'imBack',
                    title: 'description',
                    displayText: photoObj.description
                }
            ])
        );
    }

    async onTurn(turnContext) {
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Create a dialog context object.
            const dc = await this.dialogs.createContext(turnContext);

            const utterance = (turnContext.activity.text || '').trim().toLowerCase();
            if (utterance === 'cancel') {
                if (dc.activeDialog) {
                    await dc.cancelAllDialogs();
                    await dc.context.sendActivity(`Ok... canceled.`);
                } else {
                    await dc.context.sendActivity(`Nothing to cancel.`);
                }
            }

            // If the bot has not yet responded, continue processing the current dialog.
            await dc.continueDialog();

            // Start the sample dialog in response to any other input.
            if (!turnContext.responded) {
                await dc.beginDialog(SHOW_PICTURES);
            }
        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            // Do we have any new members added to the conversation?
            if (turnContext.activity.membersAdded.length !== 0) {
                // Iterate over all new members added to the conversation
                for (var idx in turnContext.activity.membersAdded) {
                    if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                        // Send a "this is what the bot does" message.
                        const description = [
                            'I am a bot that fetches flickr photos',
                            'Say anything to continue.'
                        ];
                        await turnContext.sendActivity(description.join(' '));
                    }
                }
            }
        }

        // Save changes to the user state.
        await this.userState.saveChanges(turnContext);

        // End this turn by saving changes to the conversation state.
        await this.conversationState.saveChanges(turnContext);
    }
}

module.exports.SimplePromptBot = FlickrBot;
