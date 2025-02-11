import definePlugin, {OptionType} from "@utils/types";
import {ChannelStore, GuildChannelStore, PermissionStore, SelectedChannelStore, Toasts} from "@webpack/common";
import {findByPropsLazy} from "@webpack";
import {definePluginSettings} from "@api/Settings";

const ChannelActions: {
    disconnect: () => void;
    selectVoiceChannel: (channelId: string) => void;
} = findByPropsLazy("disconnect", "selectVoiceChannel");

const CONNECT = 1n << 20n;

const LEFT_CTRL_KEY = 162;
const B_KEY = 66;
const N_KEY = 78;
const NEXT_CHANNEL_KEYBIND_ID = 1337;
const PREVIOUS_CHANNEL_KEYBIND_ID = 1338;

const settings = definePluginSettings({
    onlyNotEmpty: {
        type: OptionType.BOOLEAN,
        description: "Make sure that next voice isn't empty",
        restartNeeded: false,
        default: true
    }
})

const goToNextChannel = () => {
    const currentChannelId = SelectedChannelStore.getVoiceChannelId();
    if (!currentChannelId) {
        Toasts.show({
            message: "You aren't in voice channel",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
        return;
    }


    const currentChannel = ChannelStore.getChannel(currentChannelId)
    if (!currentChannel.isGuildVoice()) {
        Toasts.show({
            message: "You aren't in VOICE channel",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
        return
    }

    const voiceChannels = GuildChannelStore.getChannels(currentChannel.getGuildId()).VOCAL.filter(({channel: c}) => {
        const channel = ChannelStore.getChannel(c.id);

        if (settings.store.onlyNotEmpty) {
            return (channel.userLimit && channel.memberCount && channel.memberCount < channel.userLimit) && PermissionStore.can(CONNECT, channel)
        }

        return PermissionStore.can(CONNECT, channel)
    });

    const {channel: nextChannel} = voiceChannels.find(o => o.channel.position === currentChannel.position + 1) ?? voiceChannels[0];

    if (!nextChannel) {
        Toasts.show({
            message: "Couldn't find next channel",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
        return;
    }

    ChannelActions.selectVoiceChannel(nextChannel.id);
}

const goToPreviousChannel = () => {
    const currentChannelId = SelectedChannelStore.getVoiceChannelId();
    if (!currentChannelId) {
        Toasts.show({
            message: "You aren't in voice channel",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
        return;
    }


    const currentChannel = ChannelStore.getChannel(currentChannelId)
    if (!currentChannel.isGuildVoice()) {
        Toasts.show({
            message: "You aren't in VOICE channel",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
        return
    }

    const voiceChannels = GuildChannelStore.getChannels(currentChannel.getGuildId()).VOCAL.filter(({channel}) => PermissionStore.can(CONNECT, channel));
    const {channel: previousChannel} = voiceChannels.find(o => o.channel.position === currentChannel.position - 1) ?? voiceChannels[0];
    if (!previousChannel) {
        Toasts.show({
            message: "Couldn't find next channel",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
        return;
    }

    ChannelActions.selectVoiceChannel(previousChannel.id);
}

export default definePlugin({
    name: "NextRoom",
    authors: [],
    description: "Keybindings for joining next VC. Next VC - (CTRL+N). Previous VC - (CTRL+B)",
    patches: [],
    settings,
    start() {
        const discordUtils = DiscordNative.nativeModules.requireModule("discord_utils");

        discordUtils.inputEventRegister(
            NEXT_CHANNEL_KEYBIND_ID,
            [
                [0, LEFT_CTRL_KEY],
                [0, N_KEY],
            ],
            goToNextChannel,
            {
                blurred: true,
                focused: true,
            }
        )
        discordUtils.inputEventRegister(
            PREVIOUS_CHANNEL_KEYBIND_ID,
            [
                [0, LEFT_CTRL_KEY],
                [0, B_KEY],
            ],
            goToPreviousChannel,
            {
                blurred: true,
                focused: true,
            }
        )
    },
    stop() {
        DiscordNative.nativeModules.requireModule("discord_utils").inputEventUnregister(KEYBIND_ID)
    }
});
